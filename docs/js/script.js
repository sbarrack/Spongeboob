(function (Pano) {
    const panorama = new Pano.ImagePanorama( '../images/panorama2.jpg' );
    const viewer = new Pano.Viewer();
    viewer.add( panorama );
})(PANOLENS);
