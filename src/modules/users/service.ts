import { withTransaction } from "@/server/db/tx";
import {
  findUserByEmail,
  findUserById,
  findUserWithPasswordByEmail,
  deleteAddressRow,
  findAddressRow,
  insertUser,
  insertAddress,
  listAddressRows,
  listUsersRows,
  setDefaultAddressRow,
  setUserRole,
  setUserStatus,
  updateAddressRow,
  updateUserProfileRow
} from "./repository";
import type {
  AddressInput,
  AddressType,
  CreateUserInput,
  ListUsersFilter,
  UpdateAddressInput,
  UpdateUserProfileInput,
  UserRole
} from "./types";

export async function createUser(input: CreateUserInput) {
  return withTransaction((client) => insertUser(client, input));
}

export async function getUserByEmail(email: string) {
  return withTransaction((client) => findUserByEmail(client, email));
}

export async function getUserWithPasswordByEmail(email: string) {
  return withTransaction((client) => findUserWithPasswordByEmail(client, email));
}

export async function getUserById(userId: string) {
  return withTransaction((client) => findUserById(client, userId));
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
) {
  return withTransaction((client) =>
    updateUserProfileRow(client, userId, input)
  );
}

export async function disableUser(userId: string) {
  return withTransaction((client) => setUserStatus(client, userId, "disabled"));
}

export async function enableUser(userId: string) {
  return withTransaction((client) => setUserStatus(client, userId, "active"));
}

export async function changeUserRole(userId: string, role: UserRole) {
  return withTransaction((client) => setUserRole(client, userId, role));
}

export async function listUsers(filter: ListUsersFilter = {}) {
  return withTransaction((client) => listUsersRows(client, filter));
}

export async function createAddress(userId: string, input: AddressInput) {
  return withTransaction((client) => insertAddress(client, userId, input));
}

export async function listAddresses(userId: string) {
  return withTransaction((client) => listAddressRows(client, userId));
}

export async function getAddress(userId: string, addressId: string) {
  return withTransaction((client) => findAddressRow(client, userId, addressId));
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput
) {
  return withTransaction((client) =>
    updateAddressRow(client, userId, addressId, input)
  );
}

export async function deleteAddress(userId: string, addressId: string) {
  return withTransaction((client) =>
    deleteAddressRow(client, userId, addressId)
  );
}

export async function setDefaultAddress(
  userId: string,
  addressId: string,
  type: AddressType
) {
  return withTransaction((client) =>
    setDefaultAddressRow(client, userId, addressId, type)
  );
}
