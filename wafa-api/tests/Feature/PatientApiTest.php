<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Notification;
use Database\Seeders\PatientSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PatientSeeder::class);
    }

    public function test_can_list_patients_with_pagination(): void
    {
        $response = $this->getJson('/api/patients');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
                'pagination' => ['total', 'count', 'per_page', 'current_page', 'total_pages'],
            ]);
    }

    public function test_can_get_patient_registry_stats(): void
    {
        $response = $this->getJson('/api/patients/stats');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'stats' => ['total_patients', 'this_year_patients', 'gender', 'refugee_status'],
            ]);
    }

    public function test_can_generate_next_patient_id(): void
    {
        $response = $this->getJson('/api/patients/next-id?year=2026');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'year' => 2026,
            ]);
    }

    public function test_can_create_patient_with_auto_generated_id(): void
    {
        $payload = [
            'first_name' => 'خالد',
            'father_name' => 'وليد',
            'grandfather_name' => 'سعيد',
            'family_name' => 'النجار',
            'gender' => 'male',
            'birth_date' => '1995-06-15',
            'national_id' => '409988776',
            'region' => 'خانيونس',
            'phone' => '0599112233',
            'refugee_status' => 'refugee',
            'blood_type' => 'O+',
            'allergies' => 'حساسية البنسلين',
        ];

        $response = $this->postJson('/api/patients', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'تم تسجيل المريض وفتح الملف الطبي بنجاح',
            ]);

        $this->assertDatabaseHas('patients', [
            'national_id' => '409988776',
            'first_name' => 'خالد',
            'family_name' => 'النجار',
        ]);

        // Verify notification was triggered
        $this->assertDatabaseHas('notifications', [
            'type' => 'patient_registered',
        ]);
    }

    public function test_patient_validation_fails_on_missing_required_fields(): void
    {
        $response = $this->postJson('/api/patients', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['first_name', 'father_name', 'grandfather_name', 'family_name', 'gender']);
    }

    public function test_can_show_and_update_patient(): void
    {
        $patient = Patient::first();

        $showResponse = $this->getJson("/api/patients/{$patient->id}");
        $showResponse->assertStatus(200)
            ->assertJsonPath('data.id', $patient->id);

        $updateResponse = $this->putJson("/api/patients/{$patient->id}", [
            'first_name' => 'محدث',
            'father_name' => $patient->father_name,
            'grandfather_name' => $patient->grandfather_name,
            'family_name' => $patient->family_name,
            'gender' => $patient->gender,
            'phone' => '0599999999',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'first_name' => 'محدث',
            'phone' => '0599999999',
        ]);
    }

    public function test_can_search_patients_by_name_or_id(): void
    {
        $response = $this->getJson('/api/patients?search=ابو حماش');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals('20170062', $data[0]['patient_id']);
    }

    public function test_notifications_endpoints(): void
    {
        $response = $this->getJson('/api/notifications');
        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data', 'unread_count']);

        $unreadCount = $this->getJson('/api/notifications/unread-count');
        $unreadCount->assertStatus(200)
            ->assertJsonStructure(['unread_count']);
    }
}
