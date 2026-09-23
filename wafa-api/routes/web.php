<?php
use Illuminate\Support\Facades\Route;
Route::get('/', fn () => response()->json(['name' => 'Wafaa Hospital API', 'version' => '1.0', 'health' => '/up', 'api' => '/api/v1']));
