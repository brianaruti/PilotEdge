<?php

//require '../../../libraries/vendor/autoload.php';

require 'c:\xampp\htdocs\FOX_VIZ\Libraries\vendor\autoload.php';
//include 'C:\xampp\htdocs\FOX_VIZ\libraries\vendor\php-console\php-console\chromephp-master\ChromePhp.php';



use GuzzleHttp\Client;

define("USERNAME", "Admin");
define("PASSWORD", "VizDb");

$uuid = '';
$type = '';
$tmp ='';

// echo '<script>console.log(' . $_GET['uuid'] .')</script>';
// echo '<script>console.log(' . $_GET['type'] .')</script>';



class VizGHRest
{
    private $http;
    private $ghType;
    private $response;

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->http = $client = new Client([
             'base_uri' => "http://10.232.13.221/",
            //'base_uri' => "http://localhost:19398/",
        ]);
    }
/**
 * Make a Get Request to the GH
 *
 * @return void
 */
    public function GetRequest($uuid,$ghType)
    {
        $this->ghType = $ghType;

        $response = $this->http->request('GET', 'files/' . $uuid . '/', [
            'auth' => [USERNAME, PASSWORD],
        ]);

        if ($response->getStatusCode() === 200) {
           $this->ParseResponse($response);
        }

    }

    public function ParseResponse($response)
    {

        $xml = new SimpleXMLElement($response->getBody());
   
        foreach ($xml->entry as $entry) {
                                            //https://www.electrictoolbox.com/php-simplexml-element-attributes/
            if ((string) $entry->category->attributes()->term === $this->ghType) {

                //instead of returning the simpleXMlElement in an array i pulled the strings'
               //not sure if this matters but it is less data sent back to the ajax success function
                // $tmp[] = array(
                //     $this->FixUuid($entry->id),
                //     (string)$entry->title,
                // );
             
                $title = $entry->{'title'}->__toString();
                $uuid = $entry->{'id'}->__toString();
                
               $array[$uuid]=$title;

                // );
               //echo (json_encode('id: ' . $entry->id  . ' title: ' . $entry->title) ."<br /> <br />");
            }
        }
        natcasesort($array);  //this does a case insensitive sort on the array as as opposed to asort() which takes case into consideration
       $this->response = json_encode($array);

    }

    private function FixUuid($uuid){

        $id = explode(":", $uuid);
        return '<' . $id[2] . '>';
    }

    public function GetResponse()

    { 
       
       
        return $this->response;

    }
}

