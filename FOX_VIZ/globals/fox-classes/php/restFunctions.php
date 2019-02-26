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
    // private $params;
    // private $client;

    // private $method;
    // private $contentType;
    // private $postData;
    // private $postType;


    /**
     * Constructor
     */
    public function __construct()
    {
    //    $this->endpoint = $endpoint;
    //    $this->method = $method;
    //    $this->postData = $postData;
    //    $this->contentType = $contentType;
    //    $this->params= $queryParams;
    }

    /**
     * Create an instance of the client
     *
     * @param [type] $url
     * @return void
     */
    public function InitClient($endpoint,$params){
   
        //create a client
        $this->client = new Client([
        'base_uri' => $endpoint  ,
        'timeout'  => 7.0,
        'auth' => [USERNAME,PASSWORD],
    ]);
    
    $req = new Request('GET', 'files/' . $params['uuid']);
   
    $response = $this->client->send($req);

echo($response->getBody());
   
    
    }

    public function MakeRequest()
    {
        
        // $uri = new Uri();

        // $request = new Request;

        // public static function withQueryValue(UriInterface $uri, $key, $value)
        // {
        //     $result = self::getFilteredQueryString($uri, [$key]);
        //     $result[] = self::generateQueryString($key, $value);
        //     return $uri->withQuery(implode('&', $result));
        // }

    //     $request = $this->client->get($this->params);
    //  //   $response = $this->client->MakeRequest($this->method, $this->params);
      
    //     // $req = new Request($this->method,$this->client->base_uri);    
    //     //$request = $this->client->get('/query');

    //     // $request = $this->client->get('/user');
    //     // echo $request->getUrl();
    //     echo ('test');
    //     //$req = $this->client->send();
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

            if ((string) $entry->category->attributes()->term === $this->ghType) {

                //set the object vakues to strings
                $title = $entry->{'title'}->__toString();
                $uuid = $entry->{'id'}->__toString();

                $this->FixUuid($uuid);
                //creates an associative array
                $array[$uuid] = $title;
            }
        }

        natcasesort($array); //this does a case insensitive sort on the array as as opposed to asort() which takes case into consideration
       
        $this->response = json_encode($array);

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
