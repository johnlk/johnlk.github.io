        $(document).ready(function(){
            var gallery_row = $('.row');
            var images = "IMG_0582.JPG IMG_0592.JPG IMG_0593.JPG IMG_0596.JPG IMG_0597.JPG IMG_0602.JPG IMG_0610.JPG IMG_0611.JPG IMG_0615.JPG IMG_0616.JPG IMG_0621.JPG IMG_0624.JPG IMG_0625.JPG IMG_0628.JPG IMG_0632.JPG IMG_0640.JPG IMG_0641.JPG IMG_0652.JPG IMG_0657.JPG IMG_0658.JPG IMG_0661.JPG IMG_0667.JPG IMG_0673.JPG IMG_0674.JPG IMG_0677.JPG IMG_0678.JPG IMG_0679.JPG IMG_0682.JPG IMG_0693.JPG IMG_0695.JPG IMG_0704.JPG IMG_0706.JPG IMG_0712.JPG IMG_0719.JPG IMG_0727.JPG IMG_0736.JPG".split(' ');
            for(i in images){
                var image = images[i];
                image = image.replace('.JPG', '_low.JPG');
                gallery_row
                    .append('<div class="col-sm-6 col-md-4">' +
                                '<a class="lightbox" href="./images/' + image + '">' +
                                    '<img src="./images/' + image + '" >' +
                                '</a>' +
                            '</div>');
            }
            baguetteBox.run('.tz-gallery');
        });
