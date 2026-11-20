import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export type Flag = 0 | 1;

export type PeriodUnit = 'week' | 'month' | 'year';
export type SubscriptionStatus = 'trial' | 'active' | 'to_cancel' | 'cancelled';
export type PaymentMethod = 'revolut' | 'other';
export type ChargeStatus = 'planned' | 'funded' | 'paid' | 'failed' | 'unfunded' | 'skipped';
export type TransferType = 'payday' | 'vault_to_main' | 'residual_return';
export type TransferStatus = 'planned' | 'done' | 'skipped';
export type EventType =
  'price_change' | 'unexpected_charge' | 'duplicate' | 'post_cancel_charge' | 'charge_failed' | 'status_change' | 'note';
export type NotificationKind = 'funding' | 'trial_end' | 'cancel_end' | 'payday' | 'residual';

export interface SettingsTable {
  id: 1;
  payday_day: Generated<number>;
  global_margin_bp: Generated<number>;
  funding_lead_days: Generated<number>;
  default_currency: Generated<string>;
  notif_time: Generated<string>;
  trial_reminder_days: Generated<string>;
  cancel_reminder_days: Generated<string>;
  biometric_lock: Generated<Flag>;
  onboarding_done: Generated<Flag>;
  reminders_enabled: Generated<Flag>;
  ai_suggestion_enabled: Generated<Flag>;
  updated_at: Generated<string>;
}

export interface CategoryTable {
  id: string;
  name: string;
  icon_key: string;
  sort_order: Generated<number>;
}

export interface SubscriptionTable {
  id: string;
  name: string;
  category_id: Generated<string>;
  icon_key: Generated<string>;
  amount_cents: number;
  currency: Generated<string>;
  fx_buffer_bp: Generated<number>;
  period_unit: PeriodUnit;
  period_count: Generated<number>;
  anchor_day: number | null;
  next_charge_date: string;
  status: Generated<SubscriptionStatus>;
  payment_method: Generated<PaymentMethod>;
  margin_override_bp: number | null;
  trial_end_date: string | null;
  post_trial_amount_cents: number | null;
  period_end_date: string | null;
  cancel_done: Generated<Flag>;
  cancel_url: string | null;
  ai_suggestion: string | null;
  notes: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
  archived_at: string | null;
}

export interface ChargeTable {
  id: string;
  subscription_id: string;
  due_date: string;
  expected_amount_cents: number;
  funded_amount_cents: Generated<number>;
  status: Generated<ChargeStatus>;
  is_trial_conversion: Generated<Flag>;
  provision_only: Generated<Flag>;
  actual_amount_cents: number | null;
  actual_date: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface TransferTable {
  id: string;
  type: TransferType;
  planned_date: string;
  rescheduled_date: string | null;
  amount_cents: number;
  status: Generated<TransferStatus>;
  done_at: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface TransferChargeTable {
  transfer_id: string;
  charge_id: string;
  amount_cents: number;
}

export interface EventTable {
  id: string;
  subscription_id: string | null;
  type: EventType;
  occurred_on: string;
  amount_cents: number | null;
  payload: Generated<string>;
  created_at: Generated<string>;
}

export interface AiCorrectionTable {
  name_normalized: string;
  category_id: string;
  icon_key: string;
  corrected_at: Generated<string>;
}

export interface ScheduledNotificationTable {
  id: string;
  kind: NotificationKind;
  ref_id: string | null;
  fire_at: string;
  os_notification_id: string | null;
}

export interface SubscriptionMarginView {
  subscription_id: string;
  margin_bp: number;
}

export interface UpcomingChargeView {
  charge_id: string;
  due_date: string;
  subscription_id: string;
  name: string;
  icon_key: string;
  expected_amount_cents: number;
  funded_amount_cents: number;
  status: ChargeStatus;
  is_trial_conversion: Flag;
  transfer_id: string | null;
  transfer_date: string | null;
  transfer_status: TransferStatus | null;
}

export interface MonthlyCostView {
  subscription_id: string;
  category_id: string;
  monthly_cents: number;
}

export interface CostByCategoryView {
  category: string;
  monthly_cents: number;
}

export interface ChargeVarianceView {
  charge_id: string;
  subscription_id: string;
  due_date: string;
  expected_amount_cents: number;
  actual_amount_cents: number;
  variance_cents: number;
}

export interface DB {
  settings: SettingsTable;
  category: CategoryTable;
  subscription: SubscriptionTable;
  charge: ChargeTable;
  transfer: TransferTable;
  transfer_charge: TransferChargeTable;
  event: EventTable;
  ai_correction: AiCorrectionTable;
  scheduled_notification: ScheduledNotificationTable;
  v_subscription_margin: SubscriptionMarginView;
  v_upcoming_charge: UpcomingChargeView;
  v_monthly_cost: MonthlyCostView;
  v_cost_by_category: CostByCategoryView;
  v_charge_variance: ChargeVarianceView;
}

export type Subscription = Selectable<SubscriptionTable>;
export type NewSubscription = Insertable<SubscriptionTable>;
export type SubscriptionUpdate = Updateable<SubscriptionTable>;

export type Charge = Selectable<ChargeTable>;
export type NewCharge = Insertable<ChargeTable>;
export type ChargeUpdate = Updateable<ChargeTable>;

export type Transfer = Selectable<TransferTable>;
export type NewTransfer = Insertable<TransferTable>;
export type TransferUpdate = Updateable<TransferTable>;

export type AppEvent = Selectable<EventTable>;
export type NewAppEvent = Insertable<EventTable>;

export type Settings = Selectable<SettingsTable>;
export type SettingsUpdate = Updateable<SettingsTable>;

export type Category = Selectable<CategoryTable>;
