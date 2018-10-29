$(document).ready(function(){
  var gallery_row = $('.row');
  var images = "img_0582_low.JPG img_0592_low.JPG img_0593_low.JPG img_0596_low.JPG img_0597_low.JPG img_0602_low.JPG img_0610_low.JPG img_0611_low.JPG img_0615_low.JPG img_0616_low.JPG img_0621_low.JPG img_0624_low.JPG img_0625_low.JPG img_0628_low.JPG img_0632_low.JPG img_0640_low.JPG img_0641_low.JPG img_0652_low.JPG img_0657_low.JPG img_0658_low.JPG img_0661_low.JPG img_0667_low.JPG img_0673_low.JPG img_0674_low.JPG img_0677_low.JPG img_0678_low.JPG img_0679_low.JPG img_0682_low.JPG img_0693_low.JPG img_0695_low.JPG img_0704_low.JPG img_0706_low.JPG img_0712_low.JPG img_0719_low.JPG img_0727_low.JPG img_0736_low.JPG".split(' ');
  for(i in images){
    var image = images[i];
    gallery_row
      .append('<div class="col-sm-6 col-md-4">' +
                '<a class="lightbox" href="https://s3.amazonaws.com/blog123videos/images/' + image + '">' +
                    '<img src="https://s3.amazonaws.com/blog123videos/images/' + image + '" >' +
                '</a>' +
              '</div>');
  }
  baguetteBox.run('.tz-gallery');
});
