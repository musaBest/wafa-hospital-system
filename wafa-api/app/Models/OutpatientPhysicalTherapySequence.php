<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutpatientPhysicalTherapySequence extends Model
{
    protected $table = 'outpatient_pt_sequences';
    protected $fillable = ['year','patient_group','last_number'];
}
