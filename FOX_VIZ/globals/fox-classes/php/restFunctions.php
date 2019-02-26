<?php

require ($_SERVER["DOCUMENT_ROOT"] . '/FOX_VIZ/Libraries/vendor/autoload.php');
//useful link regaridng php include paths and how relative paths do not work
//http://yagudaev.com/posts/resolving-php-relative-path-problem/

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Psr7;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Psr7\Request;


define("USERNAME", "Admin");
define("PASSWORD", "VizDb");

class VizRest
{
    // private $response;
    // public $endpoint;
     private $params;
     private $filter;
    // private $client;

    // private $method;
    // private $contentType;
    // private $postData;
    // private $postType;


    /**
     * Constructor
     */
    public function __construct($endpoint)
    {
        //create a client
        $this->client = new Client([
            'base_uri' => $endpoint  ,
            'timeout'  => 7.0,
            'auth' => [USERNAME,PASSWORD],
        ]);
    }


    public function MakeRequest($method, $endpoint,$filter)
    {
        $this->filter = $filter;
        $req = new Request($method, $endpoint);
    
        $response = $this->client->send($req);

       // echo($response->getBody());
    
       // if (status === 200) {
         return   $this->ParseResponse($response);
       // }
       // else{

           // return false;
       // }
    }

    private function CreateClientBkup()
    {
        $this->InitClient($url[1]); //If the first request fails then try the backup

        SendRequest();
  
    }

    public function SendRequest()
    {
        try {
    
            $response = $this->client->send($req); //send the response  
  
          } catch (RequestException $e){
  

          }

          
          CreateClientBkup();
        
    }

    // $this->GetStatus($response->getStatusCode());
       

    public function GetStatus($status)
    {
        if (status === 200) {
            $this->ParseResponse($response);
        }
        else{

            return false;
        }

    }

    /**
     * Parse the response received by the get request function
     *
     * @param [type] $response
     * @return void
     */
    public function ParseResponse($response)
    {
        $xml = new SimpleXMLElement($response->getBody());

        foreach ($xml->entry as $entry) {
            
            //https://www.electrictoolbox.com/php-simplexml-element-attributes/

            if ((string) $entry->category->attributes()->term === $this->filter) {

                $title = $entry->{'title'}->__toString();
                $uuid = $entry->{'id'}->__toString();

                $this->FixUuid($uuid);
                //creates an associative array
                $array[$uuid] = $title;
            }
        }

        natcasesort($array); //this does a case insensitive sort on the array as as opposed to asort() which takes case into consideration
      // echo ($array);
       return $this->response = json_encode($array);

    }
    /**
     * Gets rid of the urn wording returned from viz
     *
     * @param [type] $uuid
     * @return string by reference
     */
    private function FixUuid(&$uuid)
    {

        $id = explode(":", $uuid);

        $uuid = '<' . $id[2] . '>';

        return $uuid;
    }

    /**
     * Returns the response
     *
     * @return json
     */
    public function GetResponse()
    {
        return $this->response;
    }
}
