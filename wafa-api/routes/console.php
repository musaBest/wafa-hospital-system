<?php
use Illuminate\Support\Facades\Artisan;
Artisan::command('wafaa:status', function () { $this->info('Wafaa Hospital API is ready.'); })->purpose('Check Wafaa HIS installation');
