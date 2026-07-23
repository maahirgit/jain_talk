const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_URL.match(/@(.*)/)[1],
    api_key: process.env.CLOUDINARY_URL.match(/\/\/(.*):/)[1],
    api_secret: process.env.CLOUDINARY_URL.match(/:(.*)@/)[1]
});

async function run() {
    const ids = [
        'jain_talks_reels/y1oazoqhspqhbwctxrgz',
        'jain_talks_reels/sdete6izzpvsquwcujbg',
        'jain_talks_reels/xut0j2eaomuvjj55qfjz',
        'jain_talks_reels/thpnrz1vp9sbkenstpyq',
        'jain_talks_reels/hjrpvbcgsmxvi8o5egvc'
    ];
    for(const id of ids) {
        try {
            console.log(await cloudinary.uploader.destroy(id, { resource_type: 'video' }));
        } catch(e) {
            console.error(e);
        }
    }
}
run();
