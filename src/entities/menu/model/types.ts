export interface MenuItemData {
  microfrontend: {
    id: string;
  };
  permission: {
    delete: boolean;
    guid: string;
    menu_id: string;
    menu_settings: boolean;
    read: boolean;
    role_id: string;
    update: boolean;
    write: boolean;
  };
  table: {
    attributes: Record<string, unknown>;
    description: string;
    icon: string;
    id: string;
    is_cached: boolean;
    is_changed: boolean;
    is_changed_by_host: null | boolean;
    is_login_table: boolean;
    is_system: boolean;
    label: string;
    order_by: boolean;
    section_column_count: number;
    show_in_menu: boolean;
    slug: string;
    soft_delete: boolean;
    subtitle_field_slug: string;
    with_increment_id: boolean;
  };
}

export interface MenuItemAttributes {
  label_aa: string;
  label_ak: string;
  path: string;
}

export interface MenuItem {
  label: string;
  parent_id: string;
  type: string;
  id: string;
  data: MenuItemData;
  attributes: MenuItemAttributes;
}
