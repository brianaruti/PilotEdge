<?php

class SqlServer {

    public $serverName = "FNC-SQL-PRI";   
    public $uid = "sa";     
    public $pwd = "Engineer@1";    
    public $databaseName = "VizChangeoverManager"; 
    public $conn ="";

    //Constructor
    function __construct()
    {
        $connectionInfo = array( 
            "UID"=>$this->uid,                              
            "PWD"=>$this->pwd,                              
            "Database"=>$this->databaseName);   

        //Connect to the DB
        $this->conn = sqlsrv_connect( $this->serverName, $connectionInfo);   
       
        if ($this->conn) {
            $this->status = true;
        } else {
            $this->status = false;
        };

    } //end  constructor


    //Get Status of connection
    public function getStatus()
    {
        echo "GETTING STATUS....";
        return $this->status;
    }

    public function CallStoredProc($tsql,$params)
    {
        $stmt = sqlsrv_prepare($this->conn, $tsql, $params);

        if( !$stmt ) {
            die( print_r( sqlsrv_errors(), true));
        }

        //Execute Stored Proc
        if( sqlsrv_execute( $stmt ) === false ) {
            die( print_r( sqlsrv_errors(), true));
        }

         $row = sqlsrv_fetch_array( $stmt, SQLSRV_FETCH_NUMERIC);

        return $row;

    } #called stored procs
};# sqlServer

?>