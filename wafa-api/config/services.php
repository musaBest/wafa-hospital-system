<?php

return [
    'civil_registry' => [
        // The only three official values that still need to be supplied.
        'token_url' => env('CIVIL_REGISTRY_TOKEN_URL'),
        'citizen_id_url' => env('CIVIL_REGISTRY_CITIZEN_ID_URL'),
        'client_secret' => env('CIVIL_REGISTRY_CLIENT_SECRET'),

        // Confirmed by the provider's PHP example.
        'client_id' => env('CIVIL_REGISTRY_CLIENT_ID', 'MAIN_WAFFA_HOSPITAL'),
        'token_key' => env('CIVIL_REGISTRY_TOKEN_KEY', 'access_token'),
        'auth_header' => env('CIVIL_REGISTRY_AUTH_HEADER', 'x-sso-authorization'),
        'user_ip' => env('CIVIL_REGISTRY_USER_IP', '931684898'),
        'user_agent' => env('CIVIL_REGISTRY_USER_AGENT'),

        // Session cookies are optional and must never be committed.
        'cookie' => env('CIVIL_REGISTRY_COOKIE'),

        // Secure TLS defaults. ca_bundle may contain a local absolute PEM path.
        'timeout' => (int) env('CIVIL_REGISTRY_TIMEOUT', 20),
        'connect_timeout' => (int) env('CIVIL_REGISTRY_CONNECT_TIMEOUT', 8),
        'verify_ssl' => filter_var(env('CIVIL_REGISTRY_VERIFY_SSL', true), FILTER_VALIDATE_BOOL),
        'ca_bundle' => env('CIVIL_REGISTRY_CA_BUNDLE'),
        'mock' => filter_var(env('CIVIL_REGISTRY_MOCK', false), FILTER_VALIDATE_BOOL),

        // Confirmed from the successful citizen JSON response.
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
