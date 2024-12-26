const images = [
    "../cat kaboom.gif",
    "../cat.gif", 
];

// Value that iterates through images
let index = 0;

// Change Cat Button
document.getElementById('changeCatButton').addEventListener('click', function() {
    //document.getElementById('catImage').src = "./cat-kaboom.gif";
    console.log("button pressed");
    if (index < images.length - 1) {
        document.getElementById('catImage').src = images[index]; 
            index++;
    } else {
        document.getElementById('catImage').src = images[index];
        index = 0;
    }
});

