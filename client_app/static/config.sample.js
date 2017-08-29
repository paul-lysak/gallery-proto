//Copy it to config.js and specify actual values

window.GalleryConfig = {
    region: '',
    IdentityPoolId: '',
    UserPoolId: '',
    ClientId: '',

    galleryBucket: "sample_bucket",
    galleryFolder: "path/to/album",

    contentBaseUrl: "https://YOUR_DISTRIBUTION.cloudfront.net/album_prefix",
    thumbnailBaseUrl: "https://YOUR_DISTRIBUTION.cloudfront.net/gallery/resized",
    contentCookiesEndpoint: "https://YOUR_DISTRIBUTION.cloudfront.net/gallery/cookies"
}
