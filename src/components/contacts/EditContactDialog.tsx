import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PHONE_TYPES, EMAIL_TYPES, type Contact } from "@/types/contacts";
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
  notes: z.string().trim().max(2000).optional(),
  address_line1: z.string().trim().max(255).optional(),
  address_line2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postal_code: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  phones: z.array(phoneSchema),
  emails: z.array(emailSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

export function EditContactDialog({ open, onOpenChange, contact }: EditContactDialogProps) {
  const { updateContact } = useContacts();
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: contact.first_name,
      last_name: contact.last_name || "",
      company: contact.company || "",
      job_title: contact.job_title || "",
      notes: contact.notes || "",
      address_line1: contact.address_line1 || "",
      address_line2: contact.address_line2 || "",
      city: contact.city || "",
      state: contact.state || "",
      postal_code: contact.postal_code || "",
      country: contact.country || "",
      phones: contact.phones?.length
        ? contact.phones.map(p => ({ phone_number: p.phone_number, phone_type: p.phone_type, is_primary: p.is_primary }))
        : [{ phone_number: "", phone_type: "mobile", is_primary: true }],
      emails: contact.emails?.length
        ? contact.emails.map(e => ({ email: e.email, email_type: e.email_type, is_primary: e.is_primary }))
        : [{ email: "", email_type: "work", is_primary: true }],
    },
  });

  const phonesArray = useFieldArray({ control: form.control, name: "phones" });
  const emailsArray = useFieldArray({ control: form.control, name: "emails" });

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: contact.first_name,
        last_name: contact.last_name || "",
        company: contact.company || "",
        job_title: contact.job_title || "",
        notes: contact.notes || "",
        address_line1: contact.address_line1 || "",
        address_line2: contact.address_line2 || "",
        city: contact.city || "",
        state: contact.state || "",
        postal_code: contact.postal_code || "",
        country: contact.country || "",
        phones: contact.phones?.length
          ? contact.phones.map(p => ({ phone_number: p.phone_number, phone_type: p.phone_type, is_primary: p.is_primary }))
          : [{ phone_number: "", phone_type: "mobile", is_primary: true }],
        emails: contact.emails?.length
          ? contact.emails.map(e => ({ email: e.email, email_type: e.email_type, is_primary: e.is_primary }))
          : [{ email: "", email_type: "work", is_primary: true }],
      });
    }
  }, [open, contact, form]);

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

      await updateContact.mutateAsync({
        id: contact.id,
        updates: {
          first_name: values.first_name,
          last_name: values.last_name || null,
          company: values.company || null,
          job_title: values.job_title || null,
          notes: values.notes || null,
          address_line1: values.address_line1 || null,
          address_line2: values.address_line2 || null,
          city: values.city || null,
          state: values.state || null,
          postal_code: values.postal_code || null,
          country: values.country || null,
        },
        phones,
        emails,
      });
      toast.success("Contact updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update contact");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update contact information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact Methods</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
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
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="contact" className="space-y-6 mt-4">
                {/* Emails */}
                <div>
                  <div className="flex items-center justify-between mb-3">
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
                  <div className="space-y-3">
                    {emailsArray.fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2">
                        <FormField
                          control={form.control}
                          name={`emails.${index}.email`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`emails.${index}.email_type`}
                          render={({ field }) => (
                            <FormItem className="w-28">
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
                            <FormItem className="flex items-center gap-2">
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
                  <div className="flex items-center justify-between mb-3">
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
                  <div className="space-y-3">
                    {phonesArray.fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2">
                        <FormField
                          control={form.control}
                          name={`phones.${index}.phone_number`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`phones.${index}.phone_type`}
                          render={({ field }) => (
                            <FormItem className="w-28">
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
                            <FormItem className="flex items-center gap-2">
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
              </TabsContent>

              <TabsContent value="location" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
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
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateContact.isPending}>
                {updateContact.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
