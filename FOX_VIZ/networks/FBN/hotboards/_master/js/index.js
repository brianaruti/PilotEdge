//Charcater counts used in the document
const characterCountDict = {
  boardTitle: 50,
  boardSubTitle: 30
};


function vizFieldChanged(returnValue) {


  var fieldVal = $(returnValue).val();
  var id = $(returnValue).attr("id");
  // var fieldId = $(returnValue).attr('id');

  console.log(fieldVal);
}

/**
 * Document loaded function
 */
$(document).ready(function () {


  let pl = vizrt.payloadhosting;
  pl.initialize();
  vizrt.payloadhosting.initialize();

  //pl.setFieldValueCallbacks({ "stock1": vizFieldChanged, "stock2": vizFieldChanged });

/**
 * Ajax request to populate the dropdown with GH response on load
 */
  let response = '';
  $.ajax({
    type: 'GET',
    dataType: "json",
    data: {
      //uuid: "3de61c10-b03a-445d-ab50-99f5bb63cb35",
      uuid: "5D65A5EC-55A8-4BEB-B85B-C019345BC0C2",
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
}

/**
 * Controls the appearance of the stock input fields
 */  
function StockInputDisplay(e)
{
  $(e).css("background-color", "lightblue");

  objHelpers.removeIf($(e),'input-empty')

  if ($(e).val() === "") {
    $(e).removeAttr("style");
    $(e).addClass('input-empty');
  }
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