<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number', 50)->unique()->index()->comment('Official financial receipt/transfer code (e.g. TR-2026-0001)');
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->comment('Payment amount in ILS');
            $table->string('currency', 10)->default('ILS')->comment('Currency (ILS, USD, JOD)');
            $table->enum('payment_method', ['cash', 'digital_transfer'])->default('cash')->comment('Cash or Digital/Bank transfer');
            
            // Digital Transfer Metadata (auditable)
            $table->string('sender_name', 150)->nullable()->comment('Name of the sender / organization who transferred the funds');
            $table->string('reference_number', 100)->nullable()->index()->comment('Bank or digital wallet transfer reference number');
            $table->string('transfer_platform', 100)->nullable()->comment('E-Wallet or Bank Name: Jawwal Pay, PalPay, BOP, Refah');
            
            // Financial Audit & Lifecycle
            $table->enum('status', ['confirmed', 'pending', 'cancelled'])->default('confirmed')->index();
            $table->foreignId('created_by')->constrained('users')->comment('Accountant who recorded this transaction');
            $table->timestamp('confirmed_at')->nullable();
            $table->text('notes')->nullable()->comment('Receipt remarks or accounting notes');
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};
