<?php

require '../vendor/autoload.php';
//require_once(__DIR__ . '../vendor/php-console/php-console/src/PhpConsole/__autoload.php');




use GuzzleHttp\Client;

define("USERNAME", "Admin");
define("PASSWORD", "VizDb");

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

            'base_uri' => "http://localhost:19398/",
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

/**
 * Pare the response from the server
 *
 * @param [type] $response
 * @return void
 */
    private function ParseResponse($response)
    {

        $xml = new SimpleXMLElement($response->getBody());

        foreach ($xml->entry as $entry) {
                                            //https://www.electrictoolbox.com/php-simplexml-element-attributes/
            if ((string) $entry->category->attributes()->term === $this->ghType) {

               //instead of returning the simpleXMlElement in an array i pulled the strings'
               //not sure if this matters but it is less data sent back to the ajax success function
                $tmp[] = array(
                    $this->FixUuid($entry->id),
                    (string)$entry->title,
                );
              // echo (json_encode('id: ' . $entry->id  . ' title: ' . $entry->title) ."<br /> <br />");
               
            }
           
        }

       $this->response = json_encode($tmp);
    }

/**
 * Returns the response
 *
 * @return string
 */
    public function GetResponse()

    {
        return $this->response;

    }
/**
 * Creates a viz friendly string for the uuid
 *
 * @param [type] $uuid
 * @return void
 */
    private function FixUuid($uuid){

        $id = explode(":", $uuid);
        return '<' . $id[2] . '>';
    }

    
}
