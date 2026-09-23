<?php

namespace App\Services;

use DateTimeImmutable;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CivilRegistryService
{
    /**
     * Fetch a citizen from the official endpoint by national ID.
     *
     * The official response does not repeat the national ID, so the verified
     * lookup value is used as the patient's ID number.
     */
    public function lookup(string $identityOrName): array
    {
        $config = config('services.civil_registry');

        if ($config['mock']) {
            return $this->mock($identityOrName);
        }

        $nationalId = preg_replace('/\s+/', '', trim($identityOrName));
        if (preg_match('/^\d{7,12}$/', $nationalId) !== 1) {
            throw new RuntimeException('CIVIL_REGISTRY_NAME_LOOKUP_NOT_SUPPORTED');
        }

        $this->assertConfigured($config, [
            'token_url',
            'citizen_id_url',
            'client_id',
            'client_secret',
            'data_path',
        ]);

        $url = str_contains($config['citizen_id_url'], '{id}')
            ? str_replace('{id}', rawurlencode($nationalId), $config['citizen_id_url'])
            : rtrim($config['citizen_id_url'], '/').'/'.rawurlencode($nationalId);

        $headers = [
            $config['auth_header'] => $this->accessToken($config),
            'x-user-ip' => $config['user_ip'],
            'x-user-agent' => $this->resolvedUserAgent($config),
            'x-user-id' => $nationalId,
        ];

        $response = $this->httpClient($config)
            ->withHeaders($headers)
            ->get($url);

        $response->throw();

        $payload = $response->json();
        if (!is_array($payload)) {
            throw new RuntimeException('CIVIL_REGISTRY_INVALID_RESPONSE');
        }

        $status = data_get($payload, $config['status_path']);
        if ((string) $status !== (string) $config['success_value']) {
            throw new RuntimeException('CIVIL_REGISTRY_UNSUCCESSFUL_RESPONSE');
        }

        $person = data_get($payload, $config['data_path']);
        if (!is_array($person)) {
            throw new RuntimeException('CIVIL_REGISTRY_PERSON_NOT_FOUND');
        }

        return $this->mapPerson($person, $nationalId, $config['fields']);
    }

    private function accessToken(array $config): string
    {
        $cacheKey = 'civil-registry-token-'.hash('sha256', $config['client_id']);

        return Cache::remember($cacheKey, now()->addMinutes(50), function () use ($config): string {
            $request = $this->httpClient($config)
                ->asForm()
                ->acceptJson();

            if ($this->isConfigured($config['cookie'])) {
                $request = $request->withHeaders(['Cookie' => $config['cookie']]);
            }

            $response = $request->post($config['token_url'], [
                    'client_id' => $config['client_id'],
                    'client_secret' => $config['client_secret'],
                ]);

            $response->throw();
            $token = data_get($response->json(), $config['token_key']);

            if (!is_string($token) || blank($token)) {
                throw new RuntimeException('CIVIL_REGISTRY_TOKEN_MISSING');
            }

            return $token;
        });
    }

    private function httpClient(array $config): PendingRequest
    {
        $verify = $config['verify_ssl'];
        if ($verify && $this->isConfigured($config['ca_bundle'])) {
            $verify = $config['ca_bundle'];
        }

        return Http::timeout($config['timeout'])
            ->connectTimeout($config['connect_timeout'])
            ->retry(2, 250)
            ->withOptions(['verify' => $verify]);
    }

    private function mapPerson(array $person, string $nationalId, array $fields): array
    {
        $genderValue = mb_strtolower(trim((string) data_get($person, $fields['gender'])));
        $maleValues = ['m', 'male', '1', 'ذكر'];
        $femaleValues = ['f', 'female', '2', 'أنثى', 'انثى'];

        if (in_array($genderValue, $maleValues, true)) {
            $gender = 'male';
        } elseif (in_array($genderValue, $femaleValues, true)) {
            $gender = 'female';
        } else {
            throw new RuntimeException('CIVIL_REGISTRY_UNKNOWN_GENDER_VALUE');
        }

        $record = [
            'fullName' => data_get($person, $fields['full_name']),
            'idNumber' => $nationalId,
            'dob' => $this->normaliseDate(data_get($person, $fields['dob'])),
            'gender' => $gender,
            'city' => (string) data_get($person, $fields['city'], ''),
            'area' => (string) data_get($person, $fields['area'], ''),
            'coverageEntity' => 'self',
        ];

        if (blank($record['fullName']) || blank($record['idNumber']) || blank($record['dob'])) {
            throw new RuntimeException('CIVIL_REGISTRY_REQUIRED_FIELDS_MISSING');
        }

        return $record;
    }

    private function normaliseDate(mixed $value): string
    {
        $raw = trim((string) $value);

        foreach (['d/m/Y', 'Y-m-d'] as $format) {
            $date = DateTimeImmutable::createFromFormat('!'.$format, $raw);
            $errors = DateTimeImmutable::getLastErrors();
            $valid = $errors === false
                || ($errors['warning_count'] === 0 && $errors['error_count'] === 0);

            if ($date !== false && $valid) {
                return $date->format('Y-m-d');
            }
        }

        throw new RuntimeException('CIVIL_REGISTRY_INVALID_BIRTH_DATE');
    }

    private function resolvedUserAgent(array $config): string
    {
        if ($this->isConfigured($config['user_agent'])) {
            return $config['user_agent'];
        }

        return request()->userAgent() ?: 'Wafaa-Hospital-HIS/1.0';
    }

    private function assertConfigured(array $config, array $keys): void
    {
        foreach ($keys as $key) {
            if (!$this->isConfigured($config[$key] ?? null)) {
                throw new RuntimeException('CIVIL_REGISTRY_NOT_CONFIGURED:'.$key);
            }
        }
    }

    private function isConfigured(mixed $value): bool
    {
        if (!is_string($value) || blank(trim($value))) {
            return false;
        }

        return preg_match('/^\?{4}$/', trim($value)) !== 1;
    }

    private function mock(string $identityOrName): array
    {
        $numeric = preg_match('/^\d{7,12}$/', preg_replace('/\s+/', '', $identityOrName));
        $seed = array_sum(array_map('ord', str_split($identityOrName)));
        $year = 1975 + ($seed % 30);

        return [
            'fullName' => $numeric ? ($seed % 2 ? 'محمد أحمد أبو حسن' : 'سارة محمود النجار') : trim($identityOrName),
            'idNumber' => $numeric ? preg_replace('/\s+/', '', $identityOrName) : (string) (400000000 + ($seed % 99999999)),
            'dob' => sprintf('%04d-%02d-%02d', $year, ($seed % 12) + 1, ($seed % 27) + 1),
            'gender' => $seed % 2 ? 'male' : 'female',
            'city' => ['gaza', 'rimal', 'nuseirat', 'khanyounis'][$seed % 4],
            'area' => $numeric ? 'الرمال' : 'محدّث من السجل المدني',
            'coverageEntity' => 'self',
        ];
    }
}
