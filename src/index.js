import { ALLOWED_EXTENSIONS } from "./constants.js";
import Toucan from "toucan-js";

addEventListener("fetch", (event) => {
  const sentry = new Toucan({
    dsn: SENTRY_DSN,
    event,
    environment: ENV,
  });
  event.respondWith(handleRequest(event, sentry));
});

async function handleRequest(event, sentry) {
  function respond(msg, status) {
    return new Response(msg, { status });
  }

  function ok(msg) {
    return respond(msg, 200);
  }

  function forbid(msg = "invalid request") {
    return respond(msg, 403);
  }

  function not_found(msg = "metadata not found") {
    return respond(msg, 404);
  }

  function err(msg = "something went wrong") {
    return respond(msg, 500);
  }

  function cache_resp(resp, cache, cache_key, max_age) {
    resp.headers.append("Cache-Control", `max-age=${max_age}`);
    event.waitUntil(cache.put(cache_key, resp.clone()));
    return resp;
  }

  // Gets all keys in a KV namespace.
  async function* get_all_keys(namespace, options) {
    do {
      var { keys, list_complete, cursor } = await namespace.list({
        ...options,
        cursor,
      });
      for (const key of keys) yield key;
    } while (list_complete === false);
  }

  try {
    const { request } = event;
    const url = new URL(request.url);
    const pathname = decodeURI(url.pathname);

    if (pathname === "/favicon.ico") {
      return not_found("not found");
    }

    if (pathname === "/extensions") {
      return ok(JSON.stringify(ALLOWED_EXTENSIONS));
    }

    const cache = caches.default;
    const cache_key = new Request(url.toString(), request);

    // Check cache for request.
    let response = await cache.match(cache_key);
    if (response !== undefined) {
      return response;
    }

    if (pathname === "/packages") {
      // Endpoint: `/packages`.
      // Return list of package names.
      let package_names = [];
      for await (const { name } of get_all_keys(CDNJS_PACKAGES)) {
        package_names.push(name);
      }

      // Cache response for an hour.
      // New packages are not added often.
      return cache_resp(
        ok(JSON.stringify(package_names)),
        cache,
        cache_key,
        "3600"
      );
    }

    const packages_endpoint = new RegExp(
      "^/packages/(?<package_name>[^/]+)$"
    ).exec(pathname);

    if (packages_endpoint !== null) {
      // Endpoint: `/packages/<package name>`.
      // Fetch package metadata from KV.
      const { package_name } = packages_endpoint.groups;
      const package_json = await CDNJS_PACKAGES.get(package_name);
      if (package_json === null) {
        // Cache 404 package for an hour.
        // New packages are not added often.
        return cache_resp(not_found(), cache, cache_key, "3600");
      }

      // Cache package metadata for an hour since the
      // autoupdater runs about once per hour.
      return cache_resp(ok(package_json), cache, cache_key, "3600");
    }

    const pkg_sris_endpoint = new RegExp(
      "^/packages/(?<package_name>[^/]+)/sris(/(?<version_name>[^/]+))?$"
    ).exec(pathname);

    if (pkg_sris_endpoint !== null) {
      // Endpoints: `/packages/<package name>/sris`, `/packages/<package name>/sris/<version name>`
      // Fetch SRIs for a package.
      const { package_name, version_name } = pkg_sris_endpoint.groups;
      let sris = {};
      for await (const { name, metadata } of get_all_keys(CDNJS_SRIS, {
        prefix: `${package_name}/${
          version_name === undefined ? "" : version_name
        }`,
      })) {
        sris[name] = metadata.sri;
      }

      // Cache SRIs for an hour since the
      // autoupdater runs about once per hour.
      return cache_resp(ok(JSON.stringify(sris)), cache, cache_key, "3600");
    }

    const aggregated_metadata_endpoint = new RegExp(
      "^/packages/(?<package_name>[^/]+)/all$"
    ).exec(pathname);

    if (aggregated_metadata_endpoint !== null) {
      // Endpoint: `/packages/<package name>/all`.
      // Fetch aggregated metadata for a package.
      const { package_name } = aggregated_metadata_endpoint.groups;
      const aggregated_gzip = await CDNJS_AGGREGATED_METADATA.get(
        package_name,
        "arrayBuffer"
      );
      if (aggregated_gzip === null) {
        // Cache 404 package for an hour.
        // New packages are not added often.
        return cache_resp(not_found(), cache, cache_key, "3600");
      }

      // Cache package metadata for a couple minutes.
      // The API will use this metadata to update itself often.
      let resp = ok(aggregated_gzip);
      resp.headers.set("Content-Encoding", "gzip");
      return cache_resp(resp, cache, cache_key, "300");
    }

    const versions_endpoint = new RegExp(
      "^/packages/(?<package_name>[^/]+)/versions$"
    ).exec(pathname);

    if (versions_endpoint !== null) {
      // Endpoint: `/packages/<package name>/versions`.
      // Fetch all versions for a package.
      const { package_name } = versions_endpoint.groups;
      const version_prefix = `${package_name}/`;

      let version_names = [];
      for await (const { name } of get_all_keys(CDNJS_VERSIONS, {
        prefix: version_prefix,
      })) {
        version_names.push(name.substring(version_prefix.length));
      }

      // Cache versions for an hour since the
      // autoupdater runs about once per hour.
      return cache_resp(
        ok(JSON.stringify(version_names)),
        cache,
        cache_key,
        "3600"
      );
    }

    const version_endpoint = new RegExp(
      "^/packages/(?<package_name>[^/]+)/versions/(?<version_name>[^/]+)$"
    ).exec(pathname);

    if (version_endpoint !== null) {
      // Endpoint: `/packages/<package name>/versions/<version name>`.
      const { package_name, version_name } = version_endpoint.groups;
      const version_key = `${package_name}/${version_name}`;
      const version_json = await CDNJS_VERSIONS.get(version_key);
      if (version_json === null) {
        // Cache 404 version for an hour since the
        // autoupdater runs about once per hour.
        return cache_resp(
          not_found(`version not found: ${version_key}`),
          cache,
          cache_key,
          "3600"
        );
      }

      // Each version is immutable once in KV
      // so cache it for a year.
      return cache_resp(ok(version_json), cache, cache_key, "31536000");
    }

    // Unknown request.
    return forbid();
  } catch (e) {
    sentry.captureException(e);
    return ENV === "production" ? err() : err(e.stack);
  }
}
