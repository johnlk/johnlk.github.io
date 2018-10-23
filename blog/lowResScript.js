$(document).ready(() => {
    var all_images = $('img');

    for(var i = 0; i < all_images.length; i++) {
        if(all_images[i].src.indexOf('http') == -1){
            all_images[i].src = all_images[i].src.replace('.JPG', '_low.JPG');
            //createLowResTwin(all_images.eq(i));
        }
    }

    function createLowResTwin(image) {
        var newSource = image[0].src.replace('.JPG', '_low.JPG');

        if (image.attr('id')) {
            image.after('<img id="' + image.attr('id') + '" src="' + newSource + '">');                    
        } else if(image.attr('class')) {
            image.after('<img class="' + image.attr('class') + '" src="' + newSource + '">');
        } else {
            image.after('<img src="' + newSource + '">');
        }

        image.css('display', 'none');
        image.on('load', function() {
            $(this).css('display', 'block');
            $(this).next().css('display', 'none');
        });
    }
});
