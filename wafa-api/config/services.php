<?php

return [
    'civil_registry' => [
        'token_url' => env('CIVIL_REGISTRY_TOKEN_URL', 'https://ssoidp.gov.ps/sso/module.php/sspoauth2/token.php'),
        'citizen_id_url' => env('CIVIL_REGISTRY_CITIZEN_ID_URL', 'https://ws.gov.ps/citizen/id/{id}'),
        'client_id' => env('CIVIL_REGISTRY_CLIENT_ID', 'MAIN_WAFFA_HOSPITAL'),
        'client_secret' => env('CIVIL_REGISTRY_CLIENT_SECRET', '_22a1e52c865881d81a376da679bb2c3b55f403f29e'),
        'token_key' => env('CIVIL_REGISTRY_TOKEN_KEY', 'access_token'),
        'auth_header' => env('CIVIL_REGISTRY_AUTH_HEADER', 'x-sso-authorization'),
        'user_ip' => env('CIVIL_REGISTRY_USER_IP', '931684898'),
        'user_agent' => env('CIVIL_REGISTRY_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),

        // Session cookies for government SSO provider
        'cookie' => env('CIVIL_REGISTRY_COOKIE', 'PHPSESSID=bdefdabba3d65586778ed0eb3536a13a'),

        // Secure TLS defaults
        'timeout' => (int) env('CIVIL_REGISTRY_TIMEOUT', 30),
        'connect_timeout' => (int) env('CIVIL_REGISTRY_CONNECT_TIMEOUT', 15),
        'verify_ssl' => filter_var(env('CIVIL_REGISTRY_VERIFY_SSL', false), FILTER_VALIDATE_BOOL),
        'ca_bundle' => env('CIVIL_REGISTRY_CA_BUNDLE'),
        'mock' => filter_var(env('CIVIL_REGISTRY_MOCK', false), FILTER_VALIDATE_BOOL),

        // Confirmed from the successful citizen JSON response
        'status_path' => env('CIVIL_REGISTRY_STATUS_PATH', 'status'),
        'success_value' => env('CIVIL_REGISTRY_SUCCESS_VALUE', 'success'),
        'data_path' => env('CIVIL_REGISTRY_DATA_PATH', 'data.basic'),
        'fields' => [
            'full_name' => env('CIVIL_REGISTRY_FULL_NAME_KEY', 'FULLNAME'),
            'dob' => env('CIVIL_REGISTRY_DOB_KEY', 'BIRTH_DT'),
            'gender' => env('CIVIL_REGISTRY_GENDER_KEY', 'SEX_CD'),
            'city' => env('CIVIL_REGISTRY_CITY_KEY', 'CI_REGION'),
            'area' => env('CIVIL_REGISTRY_AREA_KEY', 'STREET_ARB'),
        ],
    ],
];
