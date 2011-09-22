<?php

  // cleanup requested filepath
  $file = isset($_GET['f']) ? $_GET['f'] : 'docdown';
  $file = preg_replace('#(\.*[\/])+#', '', $file);
  $file .= preg_match('/\.[a-z]+$/', $file) ? '' : '.php';

  // output filename
  $output = isset($_GET['o'])
    ? $_GET['o']
    : isset($_SERVER['argv'][1])
      ? $_SERVER['argv'][1]
      : basename($file);

  /*--------------------------------------------------------------------------*/

  require('../docdown.php');

  // generate Markdown
  $markdown = docdown(array(
    'path' => '../' . $file,
    'url'  => 'https://github.com/jdalton/docdown/blob/master/docdown.php'
  ));

  // save to a .md file
  file_put_contents($output . '.md', $markdown);

  // print
  header('Content-Type: text/plain;charset=utf-8');
  echo $markdown . PHP_EOL;

?>