import {
  Canvas,
  Text,
  FabricImage
} from "fabric";


export function createFabricCanvas(
  logo,
  text,
  textColor,
  fontSize,
  callback
) {


  const canvasElement =
    document.createElement("canvas");


  const canvas = new Canvas(
    canvasElement,
    {
      width: 1024,
      height: 1024,
      backgroundColor: "transparent",
    }
  );



  const addText = () => {


    if(text){


      const txt = new Text(
        text,
        {

          left:512,

          top:700,

          originX:"center",

          originY:"center",

          fill:textColor,

          fontSize:fontSize * 4,

          fontWeight:"bold",

          fontFamily:"Arial"

        }
      );


      canvas.add(txt);

    }


    canvas.renderAll();

    callback(canvas);

  };





  if(logo){


    FabricImage.fromURL(
      logo,
      {
        crossOrigin:"anonymous"
      }
    )
    .then((img)=>{


      img.set({

        left:512,

        top:350,

        originX:"center",

        originY:"center",

        scaleX:0.35,

        scaleY:0.35

      });



      canvas.add(img);


      addText();


    });



  }

  else{


    addText();


  }


}