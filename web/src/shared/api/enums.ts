import { i18n } from '@/i18n';

/**
 * API enums (strings, API guide §2) with their labels in the page's language
 * (common.json → enums; the admin panel is always Arabic). Unknown future
 * values fall back to the raw value, never a missing-key string.
 */
export type Tone = 'gray' | 'gold' | 'blue' | 'green' | 'red';

interface Labelled {
  label: string;
  tone: Tone;
}

type EnumGroup =
  | 'orderStatus'
  | 'returnStatus'
  | 'format'
  | 'level'
  | 'badge'
  | 'returnReason'
  | 'cancelReason';

/** The label, or the raw value for an enum value newer than this build. */
const label = (group: EnumGroup, value: string): string =>
  i18n.t(`enums.${group}.${value}`, { defaultValue: value });

function lookup<T extends string>(
  group: EnumGroup,
  tones: Readonly<Record<T, Tone>>,
  value: string,
): Labelled {
  const tone = (tones as Readonly<Record<string, Tone | undefined>>)[value] ?? 'gray';
  return { label: label(group, value), tone };
}

// API guide §6
export type OrderStatus =
  | 'PendingPayment'
  | 'Paid'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Expired'
  | 'Refunded';

const ORDER_TONE: Readonly<Record<OrderStatus, Tone>> = {
  PendingPayment: 'gray',
  Paid: 'gold',
  Shipped: 'blue',
  Delivered: 'green',
  Cancelled: 'red',
  Expired: 'gray',
  Refunded: 'red',
};
export const orderStatusInfo = (status: string): Labelled =>
  lookup('orderStatus', ORDER_TONE, status);

// API guide §9
export type ReturnStatus =
  | 'Requested'
  | 'Approved'
  | 'Completed'
  | 'Rejected'
  | 'CancelledByCustomer';

const RETURN_TONE: Readonly<Record<ReturnStatus, Tone>> = {
  Requested: 'gold',
  Approved: 'blue',
  Completed: 'green',
  Rejected: 'red',
  CancelledByCustomer: 'gray',
};
export const returnStatusInfo = (status: string): Labelled =>
  lookup('returnStatus', RETURN_TONE, status);

// API guide §4, §4c
export type BookFormat = 'Paperback' | 'Hardcover' | 'BoxSet';
export type ReaderLevel = 'Beginner' | 'Intermediate' | 'Specialist';
export type BookBadge = 'New' | 'Deluxe' | 'Bestseller';
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold';

export const formatLabel = (value: string): string => label('format', value);
export const levelLabel = (value: string): string => label('level', value);
export const badgeLabel = (value: string): string => label('badge', value);

/** Loyalty tiers live in common.json → tier (the header pill uses them too). */
export const tierLabel = (value: string): string =>
  i18n.t(`tier.${value}`, { defaultValue: value });

// API guide §9 (returns) and §6 (customer cancellation)
export type ReturnReason = 'ChangedMind' | 'ArrivedDamaged' | 'WrongItem' | 'Other';
export const RETURN_REASONS: readonly ReturnReason[] = [
  'ChangedMind',
  'ArrivedDamaged',
  'WrongItem',
  'Other',
];
export const returnReasonLabel = (value: string): string => label('returnReason', value);

export type CancelReason =
  | 'ChangedMind'
  | 'OrderedByMistake'
  | 'FoundBetterPrice'
  | 'DeliveryTooSlow'
  | 'Other';
export const CANCEL_REASONS: readonly CancelReason[] = [
  'ChangedMind',
  'OrderedByMistake',
  'FoundBetterPrice',
  'DeliveryTooSlow',
  'Other',
];
export const cancelReasonLabel = (value: string): string => label('cancelReason', value);