
 
<?php
   

   include '../../../../../globals/fox-classes/php/sqlFunctions.php';

    $conn = new SqlServer;

    $tsql = "{call getDeviceInfo(?)}";

    $engineIP = "10.232.95.51";

    $params = array(

        array($engineIP, SQLSRV_PARAM_IN)
    );

    if($conn->getStatus( $tsql,$params))
    {
       $data =  $conn->CallStoredProc($tsql,$params);
     
       foreach ($data as &$value)
       {    

            echo $value. "\n";
            echo "-----------------<br>\n";  
       }    
    }
?>