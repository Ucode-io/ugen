"use client";

import { Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";
import { AppVisibility } from "@/entities/app/model/types";

interface VisibilitySelectorProps {
  value: AppVisibility;
  onChange: (value: AppVisibility) => void;
  requireLogin: boolean;
  onRequireLoginChange: (value: boolean) => void;
}

export const VisibilitySelector = ({
  value,
  onChange,
  requireLogin,
  onRequireLoginChange,
}: VisibilitySelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">App Visibility</CardTitle>
        <CardDescription>Control who can access your application</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Select value={value} onValueChange={(v) => onChange(v as AppVisibility)}>
            <SelectTrigger leftIcon={Globe}>
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Public">Public</SelectItem>
              <SelectItem value="Private">Private</SelectItem>
              <SelectItem value="Team only">Team only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <Checkbox
            label="Require login to access"
            checked={requireLogin}
            onCheckedChange={(checked) => onRequireLoginChange(!!checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
