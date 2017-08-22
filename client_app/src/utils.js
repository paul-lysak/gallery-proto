const U = {
    stripSuffix: function (str, suffix) {
        if (str.endsWith(suffix))
            return U.stripSuffix(str.slice(0, -suffix.length))
        else
            return str;
    },

    stripPrefix: function (str, prefix) {
        if (str.startsWith(prefix))
            return stripPrefix(str.slice(prefix.length))
        else
            return str;
    },

    stripSlashes: function (str) {
        return U.stripSuffix(U.stripPrefix(str, "/"), "/")
    },

    stripDir: function (f, parent) {
        return U.stripSlashes(f.startsWith(parent) ? f.slice(parent.length) : f);
    },

    appendSlash: function (dir) {
        if (dir.endsWith("/")) return dir;
        else return dir + "/";
    },

    /**
     * Make sure path has slash at the beginning and no slash at the end
     * @param path
     */
    normalizePathSlashes: function(path) {
        if(path == null) {
            return null
        } else {
            const p = path.startsWith("/") ? path : "/" + path
            return U.stripSuffix(p, "/")
        }
    },

    /**
     * Cut last element of the path
     * @param path
     * @returns {*}
     */
    splitPath: function(path) {
        const d = U.normalizePathSlashes(path)
        if(d == "/")
            return ["/", null]
        const lastSlash = path.lastIndexOf("/")
        if(lastSlash == 0)
            return ["/", path.slice(1)] //first-level dir
        else
            return [path.slice(0, lastSlash), path.slice(lastSlash + 1)]
    },

    splitPathTail: function(path) {
        return U.splitPath(path)
    },

    splitPathHead: function(path) {
        const d = U.normalizePathSlashes(path)
        if(d == "/")
            return [null, null]
        const secondSlash = path.indexOf("/", 1)
        if(secondSlash < 0)
            return [path.slice(1), null]
        else
            return [path.slice(1, secondSlash), path.slice(secondSlash + 1)]
    }
}

export default U