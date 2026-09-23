<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class PatientSequence extends Model {
    public $timestamps=false;
    public $incrementing=false;
    protected $primaryKey='year';
    protected $fillable=['year','last_number','male_last_number','female_last_number'];
    protected $casts=['year'=>'integer','last_number'=>'integer','male_last_number'=>'integer','female_last_number'=>'integer'];
}
