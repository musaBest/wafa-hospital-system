<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Patient;
use App\Models\Transfer;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthAndRbacApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_staff_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@wafa.hospital',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'role', 'permissions'],
            ]);
    }

    public function test_login_fails_with_invalid_password(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@wafa.hospital',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_it_admin_can_access_staff_management(): void
    {
        $itAdmin = User::where('role', 'it_admin')->first();

        $response = $this->actingAs($itAdmin)
            ->getJson('/api/staff');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data', 'pagination']);
    }

    public function test_it_admin_is_strictly_forbidden_from_transfers_module(): void
    {
        $itAdmin = User::where('role', 'it_admin')->first();

        $response = $this->actingAs($itAdmin)
            ->getJson('/api/transfers');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'forbidden_role' => 'it_admin',
            ]);
    }

    public function test_accountant_can_access_and_record_transfers(): void
    {
        $accountant = User::where('role', 'accountant')->first();
        $patient = Patient::first();

        $response = $this->actingAs($accountant)
            ->getJson('/api/transfers');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data']);

        // Record a digital transfer
        $storeResponse = $this->actingAs($accountant)
            ->postJson('/api/transfers', [
                'patient_id' => $patient->id,
                'amount' => 500,
                'payment_method' => 'digital_transfer',
                'sender_name' => 'محمد سعيد',
                'reference_number' => 'REF-99201',
                'transfer_platform' => 'Jawwal Pay',
            ]);

        $storeResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('transfers', [
            'patient_id' => $patient->id,
            'amount' => 500,
            'reference_number' => 'REF-99201',
        ]);
    }

    public function test_civil_registry_lookup_returns_mock_demographics(): void
    {
        $response = $this->getJson('/api/civil-registry/lookup/902263925');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'found' => true,
                'data' => [
                    'national_id' => '902263925',
                    'first_name' => 'ندى',
                    'family_name' => 'ابو حماش',
                ],
            ]);
    }
}
