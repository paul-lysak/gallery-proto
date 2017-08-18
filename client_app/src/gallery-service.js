import appConfig from "./config";

const dirCache = {}

function stripSuffix(str, suffix) {
    if(str.endsWith(suffix))
        return stripSuffix(str.slice(0, -suffix.length))
    else
        return str;
}

function stripPrefix(str, prefix) {
    if(str.startsWith(prefix))
        return stripPrefix(str.slice(prefix.length))
    else
        return str;
}

function stripSlashes(str) {
    return stripSuffix(stripPrefix(str, "/"), "/")
}

function stripDir(f, parent) {
    return stripSlashes(f.startsWith(parent) ? f.slice(parent.length) : f);
}

function appendSlash(dir) {
    if(dir.endsWith("/")) return dir;
    else return dir + "/";
}

const dirListCache = {}

const GalleryService = {
    list: function (dir) {
        if(dirListCache[dir]) {
            console.debug("Taking directory content from cache", dir)
            return Promise.resolve(dirListCache[dir])
        } else {
            console.debug("Retrieving directory content from S3", dir)
            const s3 = new AWS.S3();
            const d = appConfig.galleryFolder + appendSlash(dir)
            return new Promise(function (resolve, reject) {
                s3.listObjects({
                    Bucket: appConfig.galleryBucket,
                    Prefix: d,
                    Delimiter: "/"
                }, function (err, res) {
                    if (err) reject(err)
                    else {
                        // console.log("result", res)
                        if (res.IsTruncated) console.warn("s3 response truncated, application doesn't handle it yet")
                        const ret = {
                            folders: res.CommonPrefixes.map(p => stripDir(p.Prefix, d)).filter(f => f.length > 0).sort(),
                            files: res.Contents.map(f => stripDir(f.Key, d)).filter(f => f.length > 0).sort()
                        }
                        dirListCache[dir] = ret;
                        resolve(ret)
                    }
                })
            })
        }
    },

    //deprecated - use distributionUrl and cookies instead
    preSign: function(dir, file) {
        const s3 = new AWS.S3();
        const key = appConfig.galleryFolder + appendSlash(dir) + file;
        const url = s3.getSignedUrl("getObject", {Bucket: appConfig.galleryBucket, Key: key, Expires: appConfig.linkExpirationTimeout});
        console.log("presigned url", dir, file, url);
        return url;
    },

    distributionUrl: function(dir, file) {
        return stripSuffix(appConfig.contentBaseUrl, "/") + appendSlash(dir) + file
    },

    thumbnailUrl: function(dir, file, w, h) {
        const query = "?w="+w+"&h="+h
        return stripSuffix(appConfig.thumbnailBaseUrl, "/") + appendSlash(dir) + file + query
    }
}

export default GalleryService;
