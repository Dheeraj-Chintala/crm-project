import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { useConvertLeadToContact } from "@/hooks/useContacts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHONE_TYPES, EMAIL_TYPES } from "@/types/contacts";
import type { Lead } from "@/types/leads";
import { toast } from "sonner";

const phoneSchema = z.object({
  phone_number: z.string().min(1, "Phone number is required"),
  phone_type: z.string(),
  is_primary: z.boolean(),
});

const emailSchema = z.object({
  email: z.string().email("Invalid email"),
  email_type: z.string(),
  is_primary: z.boolean(),
});

const formSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional(),
  company: z.string().trim().max(200).optional(),
  job_title: z.string().trim().max(100).optional(),
  phones: z.array(phoneSchema),
  emails: z.array(emailSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface ConvertLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function ConvertLeadDialog({ open, onOpenChange, lead }: ConvertLeadDialogProps) {
  const navigate = useNavigate();
  const convertLead = useConvertLeadToContact();

  // Parse lead name into first/last
  const nameParts = lead.name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: firstName,
      last_name: lastName,
      company: "",
      job_title: "",
      phones: lead.phone
        ? [{ phone_number: lead.phone, phone_type: "mobile", is_primary: true }]
        : [{ phone_number: "", phone_type: "mobile", is_primary: true }],
      emails: lead.email
        ? [{ email: lead.email, email_type: "work", is_primary: true }]
        : [{ email: "", email_type: "work", is_primary: true }],
    },
  });

  const phonesArray = useFieldArray({ control: form.control, name: "phones" });
  const emailsArray = useFieldArray({ control: form.control, name: "emails" });

  async function onSubmit(values: FormValues) {
    try {
      const phones = values.phones
        .filter(p => p.phone_number.trim())
        .map(p => ({
          phone_number: p.phone_number,
          phone_type: p.phone_type,
          is_primary: p.is_primary,
        }));
      const emails = values.emails
        .filter(e => e.email.trim())
        .map(e => ({
          email: e.email,
          email_type: e.email_type,
          is_primary: e.is_primary,
        }));

      const contact = await convertLead.mutateAsync({
        leadId: lead.id,
        contactData: {
          first_name: values.first_name,
          last_name: values.last_name || undefined,
          company: values.company || undefined,
          job_title: values.job_title || undefined,
          phones: phones.length ? phones : undefined,
          emails: emails.length ? emails : undefined,
        },
      });

      toast.success("Lead converted to contact successfully");
      onOpenChange(false);
      navigate(`/contacts/${contact.id}`);
    } catch (error) {
      toast.error("Failed to convert lead");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Lead to Contact</DialogTitle>
          <DialogDescription>
            Convert this lead into a contact. The lead data will be linked, not duplicated.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Sales Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Emails */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Email Addresses</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => emailsArray.append({ email: "", email_type: "work", is_primary: false })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {emailsArray.fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`emails.${index}.email`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`emails.${index}.email_type`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EMAIL_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`emails.${index}.is_primary`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-1">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs !mt-0">Primary</FormLabel>
                        </FormItem>
                      )}
                    />
                    {emailsArray.fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => emailsArray.remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Phones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Phone Numbers</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => phonesArray.append({ phone_number: "", phone_type: "mobile", is_primary: false })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {phonesArray.fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`phones.${index}.phone_number`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="+1 234 567 8900" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`phones.${index}.phone_type`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PHONE_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`phones.${index}.is_primary`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-1">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs !mt-0">Primary</FormLabel>
                        </FormItem>
                      )}
                    />
                    {phonesArray.fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => phonesArray.remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={convertLead.isPending}>
                {convertLead.isPending ? "Converting..." : "Convert to Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
