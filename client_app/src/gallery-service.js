import appConfig from "./config";

const dirCache = {}

//TODO replace with more common utility libraries
function stripDir(f, parent) {
    const f1 = f.indexOf(parent) == 0 ? f.slice(parent.length) : f;
    const f2 = f1.slice(0, 1) == "/" ? f1.slice(1) : f1;
    const f3 = f2.slice(-1) == "/" ? f2.slice(0, -1) : f2;
    // console.log("stripping the parent", parent, f, f1, f2, f3)
    return f3;
}

function appendSlash(dir) {
    if(dir.slice(-1) == "/") return dir;
    else return dir + "/";
}

const GalleryService = {
    list: function (dir) {
        var s3 = new AWS.S3();
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
                    resolve({
                        folders: res.CommonPrefixes.map(p => stripDir(p.Prefix, d)).filter(f => f.length > 0 ).sort(),
                        files: res.Contents.map(f => stripDir(f.Key, d)).filter(f => f.length > 0 ).sort()
                })
                }
            })
        })
    }
}

export default GalleryService;
