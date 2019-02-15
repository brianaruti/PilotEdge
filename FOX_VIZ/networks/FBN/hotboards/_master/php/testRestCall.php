<?php

include '../../../../../globals/fox-classes/php/restFunctions.php';
$uuid;
$type;
if ($_SERVER['REQUEST_METHOD'] === 'GET') {


    if(isset($_GET['uuid'],$_GET['type']))
    {
        if($_GET['uuid'] != ""){
            $uuid = $_GET['uuid'] ;
        }

        if($_GET['type'] != ""){
            $type = $_GET['type'] ;
        }

    };

    $request = new VizGHRest;

    $request->GetRequest($uuid,$type);

    echo($request->GetResponse());
}





?>