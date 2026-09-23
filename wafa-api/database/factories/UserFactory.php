<?php
namespace Database\Factories;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
class UserFactory extends Factory { protected static ?string $password; public function definition():array{return ['username'=>$this->faker->unique()->userName(),'display_name'=>$this->faker->name(),'password'=>static::$password??=Hash::make('password'),'role'=>'cashier','active'=>true,'remember_token'=>Str::random(10)];} }
