//Charcater counts used in the document
const characterCountDict = {
  boardTitle: 50,
  boardSubTitle: 30
};


function vizFieldChanged(returnValue){


  var fieldVal = $(returnValue).val();
  var id = $(returnValue).attr("id");
 // var fieldId = $(returnValue).attr('id');

  console.log(fieldVal);


}



//Document has loaded
$(document).ready(function () {


  let pl = vizrt.payloadhosting;
  pl.initialize();
  vizrt.payloadhosting.initialize();

  //pl.setFieldValueCallbacks({ "stock1": vizFieldChanged, "stock2": vizFieldChanged });
  


  //Ajax request to populate the dropdown with GH response
  //////////////////////////////////////////////////////////////
  let response = '';
  $.ajax({
    type: 'GET',
    dataType: "json",
    data:{
      uuid: "3de61c10-b03a-445d-ab50-99f5bb63cb35",
     //uuid: "5D65A5EC-55A8-4BEB-B85B-C019345BC0C2",
      type: "FONT"
    },
  
    url: "../../../../networks/FBN/hotboards/_master/php/testRestCall.php",
    success: function (data) {

      helpers.buildDropdown(
        data,
        $('#ghDropdown'),
        'Select your geom'
      );
    },
    error: function (xhr, ajaxOptions, thrownError) {

      // alert(xhr.status);
      // alert(thrownError);
    }
  }); //end Ajax get rest


  //Event handler for viz fields
  $(".symbol-input").on("keyup", function(){
   
   // let id = $(this).attr("id");
    let vizFieldName = $(this).attr("id").split("_");
    let name = vizFieldName[1];
    
    //creat and object that can be passed to viz with the value of name and not the  [] computed property
    let obj ={
      [name]:vizFieldChanged($(this))
    }

    pl.setFieldValueCallbacks(obj);
    
    

  });
  //Event handler on key up
  //////////////////////////////////////////////////////////////
  $(".countChars").on("keyup", function () {
    $(this).css("background-color", "lightblue");
    CharacterCounter(this);
  }); //end key up

  //event handler radio buttons
  $('.form-check-input[name="stockChoices"]').change(function () {
    RadioButtonChanged(this);
  }); // End -- Radio Button

  $('.alert').on("click", function(){

    if($(this).attr("id") === "verifySymbols"){
     VerifySymbols();
    }
  });
}); //End -- Document ready function




let helpers = {
  buildDropdown: function (result, dropdown, emptyMessage) {
    // Remove current options
    dropdown.html('');
    // Add the empty option with the empty message and disable and hide it so it doesnt appear as a choice
    dropdown.append('<option selected disabled hidden>' + emptyMessage + '</option>');

    // Check result isnt empty
    if (result != '') {
      // Loop through each of the results and append the option to the dropdown
      $.each(result, function (k, v) {
        //dropdown.append('<option value="' + v[0] + '">' + v[1] + '</option>');
        dropdown.append('<button class=dropdown-item value="' + v[0] + '">' + v[1] + '</button>');
      });
    }
  }

}; //end helpers

//Radio button on Change event
//////////////////////////////////////////////////////////////
function RadioButtonChanged(e) {
  let idValue = $(e).attr("id");

  var buttonId = idValue.slice(-1);

  $(".stock-input").children(".toggle").each(function (i, obj) {

    if (buttonId >= i) {
      $(obj).attr('class', "toggle reveal");

    } else {
      $(obj).attr('class', "toggle hide");
    }
  });
} //end radioButtonChanged


//Function to set characters remaining, gets the element from the keyup event
//////////////////////////////////////////////////////////////
function CharacterCounter(e) {
  let maxNum = characterCountDict[e.id]; //get max character count

  //Set the maxLength attribute for the field triggering the event
  if ($(e).attr("maxLength") != maxNum) {
    $(e).attr("maxLength", maxNum);
  }

  //Get the text length
  var charLength = $(e).val().length;

  if (charLength > maxNum) {
    $(e).css("background-color", "red");
    $(e).css("color", "white");
  } else {
    $(e).css("background-color", "lightblue");
    $(e).css("color", "black");
  }

  if (charLength === 0) {
    e.nextElementSibling.innerHTML = "";
  } else {
    e.nextElementSibling.innerHTML =
      "REMAING CHARACTERS: " + (maxNum - charLength);
  }

  // alert(maxNumber);
}

function VerifySymbols(){
  let counter = 0;
  $('.form-check-input[name="stockChoices"]').each(function(){
     if( $(this).is(':checked'))
     {
     //alert($(this).attr("id"));
      
      return false;
     }
   

     counter ++;
   
  });

  //Get the text for each
  const el = document.querySelectorAll(".symbol-input");
  for (let i = 0; i <= counter; i++) {
    console.log('symbolInputs: ' + el[i].value);
    
    if(el[i].classList.contains('input-empty')){
      el[i].classList.remove('input-empty');
    };

    if(el[i].value === ""){
      el[i].classList.add('input-empty')
      el[i].placeholder = "You must enter a symbol";
    
    };
	}
}