//Charcater counts used in the document
const characterCountDict = {
  boardTitle: 50,
  boardSubTitle: 30
};

let isVerified = false; //global var to track the stock verification button

function vizFieldChanged(returnValue) {


  var fieldVal = $(returnValue).val();
  var id = $(returnValue).attr("id");
  // var fieldId = $(returnValue).attr('id');

  console.log(fieldVal);
}
let response ='';
var AjaxHandler = {

  GetRequest: function (method, url, dataType, param, callback) {
    $.ajax({
      type: method,
      dataType: dataType,
      data: 
      param,
      url: url,
      success: function(data){
       // callback(data);
       //alert("THIS IS SUCCES" + response);

       helpers.buildDropdown(
              data,
              $('#ghDropdown'),
              'Select your geom'
            );
      },
      error: function (xhr, ajaxOptions, thrownError) {
         alert(xhr);
            alert(xhr.status);
      }
    }); //end Ajax get rest
  }
}
/**
 * Document loaded function
 */
//let response;
let method = 'GET';
let url = '../../../../networks/FBN/hotboards/_master/php/testRestCall.php';
let dataType = "JSON";
let param = jQuery.param({uuid: "3de61c10-b03a-445d-ab50-99f5bb63cb35", type: "FONT", endpoint: "ghHub"});

// data = JSON.stringify(data);
// data.replace("{","").replace("}","");
// console.log(data.replace("{","").replace("}",""););


//data = JSON.stringify(data);

function successHandler(response){
  if(response.type == "Success"){
    alert(response);
  }
}

$(document).ready(function () {




AjaxHandler.GetRequest(method,url,dataType,param,successHandler);




  let pl = vizrt.payloadhosting;
  pl.initialize();
  vizrt.payloadhosting.initialize();

  //pl.setFieldValueCallbacks({ "stock1": vizFieldChanged, "stock2": vizFieldChanged });


  /**
   * Ajax request to populate the dropdown with GH response on load
   */
  // let response = '';
  // $.ajax({
  //   type: 'GET',
  //   dataType: "json",
  //   data: {
  //     // uuid: "3de61c10-b03a-445d-ab50-99f5bb63cb35",
  //     uuid: "5D65A5EC-55A8-4BEB-B85B-C019345BC0C2",
  //     type: "FONT"
  //   },

  //   url: "../../../../networks/FBN/hotboards/_master/php/testRestCall.php",
  //   success: function (data) {
  //     // alert(response);
  //     helpers.buildDropdown(
  //       data,
  //       $('#ghDropdown'),
  //       'Select your geom'
  //     );

  //     console.log(data);;
  //   },
  //   error: function (xhr, ajaxOptions, thrownError) {
  //     // console.log(data);

  //     alert(xhr);
  //     alert(xhr.status);
  //   }
  // }); //end Ajax get rest


  //Event handler for viz fields
  //////////////////////////////////////////////////////////////
  $(".symbol-input").on("keyup", function () {

    // let id = $(this).attr("id");
    let vizFieldName = $(this).attr("id").split("_");
    let name = vizFieldName[1];

    //creat and object that can be passed to viz with the value of name and not the  [] computed property
    let obj = {
      [name]: vizFieldChanged($(this))
    }

    pl.setFieldValueCallbacks(obj);


  })

  /**
   * Event delegation - click event for dynamically created elements
   * handler for drop down buttons created via rest call
   */
  $(".dropdown-menu").on("click", "button", function (event) {
    event.preventDefault();

    let menu = $(this).closest('#ghDropdown').find('#dropdownMenuButton');
    $(menu).text($(this).text());

    // console.log( $( this ).text() );
    // console.log($(tst).text());
  });



  /**
   * handler for stocksymbols
   */
  $(".symbol-input").on("input", function () {
    StockInputDisplay($(this));
  });

  /**
   * handler on key up to count characters
   */
  $(".countChars").on("keyup", function () {
    $(this).css("background-color", "lightblue");
    CharacterCounter(this);
  });

  /**
   * handler radio buttons
   */
  $('[name="stockChoices"]').change(function () {
    RadioButtonChanged(this);
  });

  /**
   * handler for submit button
   */
  $('.alert').on("click", function () {

    if ($(this).attr("id") === "verifySymbols") {
      VerifySymbols();
    }


  });
}); //End -- Document ready function


/**
 * Radio button on Change event
 */
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
}

/**
 * Function to set characters remaining, gets the element from the keyup event
 */
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

/**
 * Function to verify symbols
 */
function VerifySymbols() {

  let counter = 0;

  //get the number of the radial button checked
  $('.form-check-input[name="stockChoices"]').each(function () {
    return $(this).is(':checked') ? false : counter++;
  });

  //loop through the number of selected inputs
  $(".symbol-input").each(function (i) {

    if (i <= counter) {

      objHelpers.removeIf($(this), 'input-empty'); //rmeove the input empty class if there is one, then check and add them back if needed

      if ($(this).val() === "") {

        $(this).addClass('input-empty');
      }
    }
    else {
      return false;
    }
  });

  $isVerified = true;
}

/**
 * Controls the appearance of the stock input fields
 */
function StockInputDisplay(e) {
  $(e).css("background-color", "lightblue");

  objHelpers.removeIf($(e), 'input-empty')

  if ($(e).val() === "") {
    $(e).removeAttr("style");
    $(e).addClass('input-empty');
  }

  $isVerified = false; //set to false on any typing
}

/**
 * Helpers for common tasks with jquery objs
 */
let objHelpers = {

  removeIf: function (obj, className) {

    if ($(obj).hasClass(className)) {

      $(obj).removeClass(className);
    };
  }
};

/**
 * dropDown helper functions
 */
let helpers = {
  buildDropdown: function (result, dropdown, emptyMessage) {

    let menu = $(dropdown).find('.dropdown-menu');

    menu.html(''); //clear before adding

    if (result != '') {
      // Loop through each of the results and append the option to the dropdown
      $.each(result, function (index, value) {
        //dropdown.append('<option value="' + v[0] + '">' + v[1] + '</option>');
        menu.append('<button class=dropdown-item value="' + index + '">' + value + '</button>');
      });
    }
  }

}; //end helpers