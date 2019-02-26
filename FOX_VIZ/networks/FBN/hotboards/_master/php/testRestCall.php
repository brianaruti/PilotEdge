<?php

include '../../../../../globals/fox-classes/php/restFunctions.php';


$params = array();

$primaryGH = 'http://10.232.13.221/';
$backupGH = 'http://localhost:19398/';
$endPoint;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    //check to see the endpoint is set to know what client to create and with the correct parameters
    if( isset($_GET['endpoint']) && $_GET['endpoint'] != ""){

        $endPoint = $_GET['endpoint'];
        switch ($endPoint) {

        case 'ghHub':
            SendRestGH();
            break;
        }
    }   
}


/**
 * Handle all the logic to send a request the the REST service of the graphics hub
 *
 * @return void
 */
function SendRestGH()
{
    if(isset($_GET['uuid'],$_GET['type']))
        {

            if($_GET['uuid'] != ""){
    
                $params['uuid'] = $_GET['uuid'];
            }
    
            // if($_GET['type'] != ""){
    
            //     $params['type'] = $_GET['type'];
            // }
        };

  //  $endpoint = $params['type'] . '/'. $params['uuid'] . '/';
        
    //Create a client for the primary endpoint
    $client = new VizRest($GLOBALS['backupGH']);
    $response = $client->MakeRequest('GET','files/' .$params['uuid'],'IMAGE' );
    
    if($response){
        echo($response);

    }
  
};


 
 
        

/**
 * first create an instance of the class to connect with the correct primary and backup ip addresses
 * 
 * second try to connect to primary
 * 
 * if there is no connection then try the backup, if there is a connection but a bad response is returned then return that response
 * 
 * try the backup -- if the backup connects but there is a bad response return that respone
 * 
 * if the backup can not connect stop trying and echo back a failure
 */



    
//     if($request->GetRequest($uuid,$type) == false){


//     }

//     if(!$request->GetStatus()){

//         echo ('here');
//     }
  
//     echo($request->GetResponse()); //send back to ajax
// }


  





?>