"use client";

import { useState, useEffect, useMemo } from "react";
import { UserPlus, Trash2, Wrench } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { ReusableTabs, UsageIndicator, Input } from "@/shared/ui";
import { WorkspaceDataTable } from "./workspace-data-table";
import { Button } from "@/shared/ui";
import { Search } from "lucide-react";
import { useAuthStore, useIsSuperAdmin } from "@/entities/session";
import { InviteUserModal } from "./invite-user-modal";
import { UpgradePlanDialog } from "@/widgets/sidebar/ui/components/upgrade-plan-dialog";
import {
  useClientTypes,
  useRoles,
  useUsers,
  useBuilders,
  useBuilderRoles,
  useDeleteUser,
} from "../api/users";

const BUILDERS_TAB_ID = "__builders__";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { user } from "@elevenlabs/elevenlabs-js/api";

interface User {
  id: string;
  name: string;
  role: string;
  login: string;
  mail: string;
  email?: string;
  phone: string;
  role_id: string;
  client_id: string;
  company_id: string;
  client_type_id?: string;
  status?: string;
  client_type_id_data?: {
    name: string;
  };
  guid: string;
  role_id_data?: {
    name: string;
  };
}

interface UsersManagementProps {
  projectId?: string;
  projectInfo?: any;
}

export const UsersManagement = ({
  projectId: propProjectId,
  projectInfo: propProjectInfo,
}: UsersManagementProps) => {
  // Auth store data
  const authProject = useAuthStore((state) => state.project);
  const authUser = useAuthStore((state) => state.user);
  const ucodeProjectId = useAuthStore((state) => state.ucodeProjectId);

  const projectId =
    propProjectId || ucodeProjectId || authProject?.project_id || "";
  const projectName = propProjectInfo?.title || authProject?.title || "";
  const companyName = propProjectInfo?.company_name || "My Company";
  const envId = authUser?.environment_id || "";

  const [activeClientType, setActiveClientType] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isSuperAdmin = useIsSuperAdmin();

  // company-stats is a Bearer-only endpoint (see instance.ts), so it
  // authenticates with the user token instead of the project API-KEY.
  const { data: companyStats } = useQuery({
    queryKey: ["company-stats"],
    queryFn: async () => {
      const { data } = await api.get("/v1/pricing/company-stats");
      return data;
    },
    enabled: !isSuperAdmin,
    staleTime: 0,
  });

  const usersStat = companyStats?.data?.user_count;
  const buildersStat = companyStats?.data?.builders;

  const { data: clientTypeOptions = [] } = useClientTypes(projectId);
  const queryClient = useQueryClient();
  const deleteUser = useDeleteUser();

  const activeTableSlug = useMemo(() => {
    return clientTypeOptions.find((opt) => opt.value === activeClientType)
      ?.table_slug;
  }, [clientTypeOptions, activeClientType]);

  // Set default client type when options are loaded
  useEffect(() => {
    if (clientTypeOptions.length > 0 && !activeClientType) {
      setActiveClientType(clientTypeOptions[0].value);
    }
  }, [clientTypeOptions, activeClientType]);

  const { data: roles = [] } = useRoles({
    id: activeClientType,
    projectId,
  });

  // Static "Builders" tab: lists auth-service builder users with the token.
  const isBuildersTab = activeClientType === BUILDERS_TAB_ID;
  const sessionProjectId = authProject?.project_id || "";

  const { data: builderRoles = [] } = useBuilderRoles(sessionProjectId);
  const buildersClientTypeId = useMemo(
    () =>
      (builderRoles as any[]).find((r) => r?.name === "DEFAULT ADMIN")
        ?.client_type_id || "",
    [builderRoles],
  );

  const { data: buildersData, isLoading: isLoadingBuilders } = useBuilders({
    clientTypeId: buildersClientTypeId,
    projectId: sessionProjectId,
    limit: pageSize,
    offset: currentPage,
    enabled: isBuildersTab,
  });

  const {
    data,
    isLoading,
    refetch: refetchUsers,
  } = useUsers({
    clientTypeId: activeClientType,
    limit: pageSize,
    offset: currentPage,
    projectId,
    search: searchTerm,
    tableSlug: activeTableSlug,
    enabled: !isBuildersTab,
  });

  const tableData = isBuildersTab
    ? buildersData?.response || []
    : data?.data?.response || [];
  const tableCount = isBuildersTab
    ? buildersData?.count || 0
    : data?.data?.count || 0;
  const tableLoading = isBuildersTab ? isLoadingBuilders : isLoading;

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["pricing-all"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
      setUserToDelete(null);
    },
    onError: (error) => {
      console.error("Failed to delete user:", error);
    },
  });

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setIsInviteModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsInviteModalOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      { accessorKey: "client_platform_id_data.name", header: "Name" },
      {
        accessorKey: "client_type_id_data.name",
        header: "User Type",
        cell: ({ row }) => (
          <span className="bg-primary/10 text-primary border-primary/20 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold">
            {row.original.client_type_id_data?.name}
          </span>
        ),
      },
      {
        accessorKey: "role_id_data.name",
        header: "Role",
        cell: ({ row }) => (
          <span className="bg-bg-sidebar border-border-subtle text-text-muted inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold">
            {row.original.role_id_data?.name}
          </span>
        ),
      },
      { accessorKey: "login", header: "Login" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "phone", header: "Phone" },
      {
        id: "actions",
        header: () => <div className="text-right">Action</div>,
        cell: ({ row }) => (
          <div className="text-right" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setUserToDelete(row.original);
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ),
      },
    ],
    [roles],
  );

  // Builders come from the auth service and only carry login / email / status.
  const buildersColumns = useMemo<ColumnDef<User>[]>(
    () => [
      { accessorKey: "login", header: "Login" },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="bg-primary/10 text-primary border-primary/20 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold">
            {row.original.status}
          </span>
        ),
      },
    ],
    [],
  );

  const activeColumns = isBuildersTab ? buildersColumns : columns;

  const subTabOptions = [
    { id: BUILDERS_TAB_ID, label: "Builders", icon: <Wrench size={14} /> },
    ...clientTypeOptions.map((opt) => ({
      id: opt.value,
      label: opt.label,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-main mb-1 text-[22px] font-bold">Users</h1>
          <p className="text-text-muted text-[13px]">
            Manage application users
          </p>
        </div>
        <div className="flex items-center gap-4">
          <UsageIndicator
            label="Builders"
            value={buildersStat?.current || 0}
            total={buildersStat?.limit || 0}
            percentage={
              buildersStat?.limit
                ? Math.min(
                    ((buildersStat.current || 0) / buildersStat.limit) * 100,
                    100,
                  )
                : 0
            }
          />
          <UsageIndicator
            label="Users"
            value={usersStat?.current || 0}
            total={usersStat?.limit || 0}
            percentage={
              usersStat?.limit
                ? Math.min(
                    ((usersStat.current || 0) / usersStat.limit) * 100,
                    100,
                  )
                : 0
            }
          />
          <Button
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 h-9 rounded-lg px-4 text-[13px] font-semibold text-white"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade Plan
          </Button>
        </div>
      </div>

      <div className="border-border-subtle no-scrollbar overflow-x-auto w-fit">
        {subTabOptions.length > 0 && (
          <ReusableTabs
            options={subTabOptions}
            activeId={activeClientType}
            onTabChange={(id: string) => {
              setActiveClientType(id);
              setCurrentPage(0);
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="group relative max-w-[320px] flex-1">
          <Search
            className="text-text-muted group-focus-within:text-primary absolute top-1/2 left-3 -translate-y-1/2 transition-colors"
            size={16}
          />
          <Input
            placeholder="Search users..."
            className="bg-bg-card border-border-subtle focus:border-primary focus:ring-primary/20 h-9 pl-10 transition-all outline-none focus:ring-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-border-subtle h-9 gap-2 px-8 font-semibold"
            onClick={() => setIsBuilderModalOpen(true)}
          >
            <UserPlus size={16} />
            Add Builder
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 h-9 gap-2 px-8 font-semibold text-white"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <UserPlus size={16} />
            Invite User
          </Button>
        </div>
      </div>

      <WorkspaceDataTable
        data={tableData}
        columns={activeColumns}
        totalCount={tableCount}
        page={currentPage + 1}
        limit={pageSize}
        onPageChange={(p) => setCurrentPage(p - 1)}
        onLimitChange={setPageSize}
        isLoading={tableLoading}
        onRowClick={isBuildersTab ? undefined : handleRowClick}
        containerClassName="max-h-[480px] overflow-y-auto"
      />

      <InviteUserModal
        open={isInviteModalOpen}
        onOpenChange={handleModalClose}
        projectId={ucodeProjectId || ""}
        projectName={projectName}
        companyName={companyName}
        envId={envId}
        initialData={selectedUser}
      />

      <InviteUserModal
        open={isBuilderModalOpen}
        onOpenChange={setIsBuilderModalOpen}
        projectId={ucodeProjectId || ""}
        projectName={projectName}
        companyName={companyName}
        envId={envId}
        isBuilder
      />

      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user{" "}
              <span className="text-text-main font-semibold">
                {userToDelete?.login}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (userToDelete) {
                  deleteMutation({
                    id: userToDelete.id || userToDelete.guid,
                    clientTypeId: activeClientType,
                    tableSlug: activeTableSlug || "",
                  });
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};
