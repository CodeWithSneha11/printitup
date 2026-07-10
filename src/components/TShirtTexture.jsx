import * as THREE from "three";


export function createTshirtTexture({
    text,
    textColor = "#000000",
    fontSize = 18
}) {


    const canvas = document.createElement("canvas");

    canvas.width = 1024;
    canvas.height = 1024;


    const ctx = canvas.getContext("2d");


    // Transparent background
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    if(text){


        ctx.fillStyle = textColor;


        ctx.font =
        `bold ${fontSize * 5}px Arial`;


        ctx.textAlign = "center";

        ctx.textBaseline = "middle";


        ctx.fillText(
            text,
            canvas.width / 2,
            canvas.height / 2
        );


    }



    const texture =
    new THREE.CanvasTexture(canvas);


    texture.flipY = true;

    texture.needsUpdate = true;


    return texture;

}