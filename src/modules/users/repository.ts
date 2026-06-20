import type { DbClient } from "@/server/db/pool";
import type {
  CreateUserInput,
  Address,
  AddressInput,
  ListUsersFilter,
  UpdateAddressInput,
  UpdateUserProfileInput,
  User,
  UserRole,
  UserStatus,
  UserWithPassword
} from "./types";

type AddressRow = {
  id: string;
  user_id: string;
  type: Address["type"];
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  subdistrict: string | null;
  district: string;
  province: string;
  postal_code: string;
  country_code: string;
  tax_id: string | null;
  company_name: string | null;
  branch_name: string | null;
  is_default: boolean;
};

function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    recipientName: row.recipient_name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    subdistrict: row.subdistrict,
    district: row.district,
    province: row.province,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    taxId: row.tax_id,
    companyName: row.company_name,
    branchName: row.branch_name,
    isDefault: row.is_default
  };
}

export async function insertUser(
  client: DbClient,
  input: CreateUserInput
): Promise<User> {
  const result = await client.query<{
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: User["role"];
    status: User["status"];
  }>(
    `
      insert into users (email, password_hash, name, phone, role)
      values ($1, $2, $3, $4, $5)
      returning id, email, name, phone, role, status
    `,
    [
      input.email.toLowerCase(),
      input.passwordHash,
      input.name,
      input.phone ?? null,
      input.role ?? "customer"
    ]
  );

  return result.rows[0];
}

export async function findUserByEmail(
  client: DbClient,
  email: string
): Promise<User | null> {
  const result = await client.query<User>(
    `
      select id, email, name, phone, role, status
      from users
      where email = $1
    `,
    [email.toLowerCase()]
  );

  return result.rows[0] ?? null;
}

export async function findUserWithPasswordByEmail(
  client: DbClient,
  email: string
): Promise<UserWithPassword | null> {
  const result = await client.query<{
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: UserRole;
    status: UserStatus;
    password_hash: string;
  }>(
    `
      select id, email, name, phone, role, status, password_hash
      from users
      where email = $1
    `,
    [email.toLowerCase()]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash
  };
}

export async function findUserById(
  client: DbClient,
  userId: string
): Promise<User | null> {
  const result = await client.query<User>(
    `
      select id, email, name, phone, role, status
      from users
      where id = $1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function updateUserProfileRow(
  client: DbClient,
  userId: string,
  input: UpdateUserProfileInput
): Promise<User> {
  const result = await client.query<User>(
    `
      update users
      set name = coalesce($2, name),
          phone = case when $3 then $4 else phone end
      where id = $1
      returning id, email, name, phone, role, status
    `,
    [userId, input.name ?? null, "phone" in input, input.phone ?? null]
  );

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  return result.rows[0];
}

export async function setUserStatus(
  client: DbClient,
  userId: string,
  status: UserStatus
): Promise<User> {
  const result = await client.query<User>(
    `
      update users
      set status = $2
      where id = $1
      returning id, email, name, phone, role, status
    `,
    [userId, status]
  );

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  return result.rows[0];
}

export async function setUserRole(
  client: DbClient,
  userId: string,
  role: UserRole
): Promise<User> {
  const result = await client.query<User>(
    `
      update users
      set role = $2
      where id = $1
      returning id, email, name, phone, role, status
    `,
    [userId, role]
  );

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  return result.rows[0];
}

export async function listUsersRows(
  client: DbClient,
  filter: ListUsersFilter = {}
): Promise<User[]> {
  const result = await client.query<User>(
    `
      select id, email, name, phone, role, status
      from users
      where ($1::text is null or email ilike '%' || $1 || '%' or name ilike '%' || $1 || '%')
        and ($2::text is null or role = $2)
        and ($3::text is null or status = $3)
      order by created_at desc
      limit $4
    `,
    [
      filter.query?.trim() || null,
      filter.role ?? null,
      filter.status ?? null,
      filter.limit ?? 50
    ]
  );

  return result.rows;
}

export async function insertAddress(
  client: DbClient,
  userId: string,
  input: AddressInput
): Promise<Address> {
  if (input.isDefault) {
    await client.query(
      "update addresses set is_default = false where user_id = $1 and type = $2",
      [userId, input.type]
    );
  }

  const result = await client.query<AddressRow>(
    `
      insert into addresses (
        user_id, type, recipient_name, phone, line1, line2, subdistrict,
        district, province, postal_code, country_code, tax_id, company_name,
        branch_name, is_default
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      returning id, user_id, type, recipient_name, phone, line1, line2,
        subdistrict, district, province, postal_code, country_code, tax_id,
        company_name, branch_name, is_default
    `,
    [
      userId,
      input.type,
      input.recipientName,
      input.phone,
      input.line1,
      input.line2 ?? null,
      input.subdistrict ?? null,
      input.district,
      input.province,
      input.postalCode,
      input.countryCode ?? "TH",
      input.taxId ?? null,
      input.companyName ?? null,
      input.branchName ?? null,
      input.isDefault ?? false
    ]
  );

  return mapAddress(result.rows[0]);
}

export async function listAddressRows(
  client: DbClient,
  userId: string
): Promise<Address[]> {
  const result = await client.query<AddressRow>(
    `
      select id, user_id, type, recipient_name, phone, line1, line2,
        subdistrict, district, province, postal_code, country_code, tax_id,
        company_name, branch_name, is_default
      from addresses
      where user_id = $1
      order by is_default desc, created_at desc
    `,
    [userId]
  );

  return result.rows.map(mapAddress);
}

export async function findAddressRow(
  client: DbClient,
  userId: string,
  addressId: string
): Promise<Address | null> {
  const result = await client.query<AddressRow>(
    `
      select id, user_id, type, recipient_name, phone, line1, line2,
        subdistrict, district, province, postal_code, country_code, tax_id,
        company_name, branch_name, is_default
      from addresses
      where user_id = $1 and id = $2
    `,
    [userId, addressId]
  );

  return result.rows[0] ? mapAddress(result.rows[0]) : null;
}

export async function updateAddressRow(
  client: DbClient,
  userId: string,
  addressId: string,
  input: UpdateAddressInput
): Promise<Address> {
  const current = await findAddressRow(client, userId, addressId);
  if (!current) throw new Error("Address not found");

  const nextType = input.type ?? current.type;
  if (input.isDefault) {
    await client.query(
      "update addresses set is_default = false where user_id = $1 and type = $2 and id <> $3",
      [userId, nextType, addressId]
    );
  }

  const result = await client.query<AddressRow>(
    `
      update addresses
      set type = coalesce($3, type),
          recipient_name = coalesce($4, recipient_name),
          phone = coalesce($5, phone),
          line1 = coalesce($6, line1),
          line2 = case when $7 then $8 else line2 end,
          subdistrict = case when $9 then $10 else subdistrict end,
          district = coalesce($11, district),
          province = coalesce($12, province),
          postal_code = coalesce($13, postal_code),
          country_code = coalesce($14, country_code),
          tax_id = case when $15 then $16 else tax_id end,
          company_name = case when $17 then $18 else company_name end,
          branch_name = case when $19 then $20 else branch_name end,
          is_default = coalesce($21, is_default)
      where user_id = $1 and id = $2
      returning id, user_id, type, recipient_name, phone, line1, line2,
        subdistrict, district, province, postal_code, country_code, tax_id,
        company_name, branch_name, is_default
    `,
    [
      userId,
      addressId,
      input.type ?? null,
      input.recipientName ?? null,
      input.phone ?? null,
      input.line1 ?? null,
      "line2" in input,
      input.line2 ?? null,
      "subdistrict" in input,
      input.subdistrict ?? null,
      input.district ?? null,
      input.province ?? null,
      input.postalCode ?? null,
      input.countryCode ?? null,
      "taxId" in input,
      input.taxId ?? null,
      "companyName" in input,
      input.companyName ?? null,
      "branchName" in input,
      input.branchName ?? null,
      input.isDefault ?? null
    ]
  );

  return mapAddress(result.rows[0]);
}

export async function deleteAddressRow(
  client: DbClient,
  userId: string,
  addressId: string
) {
  const result = await client.query(
    "delete from addresses where user_id = $1 and id = $2",
    [userId, addressId]
  );

  if (result.rowCount === 0) {
    throw new Error("Address not found");
  }
}

export async function setDefaultAddressRow(
  client: DbClient,
  userId: string,
  addressId: string,
  type: Address["type"]
): Promise<Address> {
  const address = await findAddressRow(client, userId, addressId);
  if (!address) throw new Error("Address not found");

  await client.query(
    "update addresses set is_default = false where user_id = $1 and type = $2",
    [userId, type]
  );

  const result = await client.query<AddressRow>(
    `
      update addresses
      set type = $3, is_default = true
      where user_id = $1 and id = $2
      returning id, user_id, type, recipient_name, phone, line1, line2,
        subdistrict, district, province, postal_code, country_code, tax_id,
        company_name, branch_name, is_default
    `,
    [userId, addressId, type]
  );

  return mapAddress(result.rows[0]);
}
