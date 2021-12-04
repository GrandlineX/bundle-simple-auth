export interface GroupPermissionRow {
  id: number;
  group_name: string;
  permission: number;
  permission_name: string;
}

export interface PermissionRow {
  permission_name: string;
}

export interface UserGroupRow {
  id: number;
  user_name: string;
  disabled: boolean;
  group_id: number;
}
