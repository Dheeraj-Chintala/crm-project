import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { Contact, ContactPhone, ContactEmail, ContactActivity } from "@/types/contacts";

export function useContacts() {
  const { user } = useAuth();
  const { logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch owner profiles
      const ownerIds = [...new Set(data.map(c => c.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch phones and emails for all contacts
      const contactIds = data.map(c => c.id);
      
      const [phonesResult, emailsResult] = await Promise.all([
        supabase.from("contact_phones").select("*").in("contact_id", contactIds),
        supabase.from("contact_emails").select("*").in("contact_id", contactIds),
      ]);

      const phonesMap = new Map<string, ContactPhone[]>();
      const emailsMap = new Map<string, ContactEmail[]>();

      phonesResult.data?.forEach(phone => {
        if (!phonesMap.has(phone.contact_id)) {
          phonesMap.set(phone.contact_id, []);
        }
        phonesMap.get(phone.contact_id)!.push(phone);
      });

      emailsResult.data?.forEach(email => {
        if (!emailsMap.has(email.contact_id)) {
          emailsMap.set(email.contact_id, []);
        }
        emailsMap.get(email.contact_id)!.push(email);
      });

      return data.map(contact => ({
        ...contact,
        owner: profileMap.get(contact.owner_id),
        phones: phonesMap.get(contact.id) || [],
        emails: emailsMap.get(contact.id) || [],
      })) as Contact[];
    },
    enabled: !!user,
  });

  const createContact = useMutation({
    mutationFn: async (contact: {
      first_name: string;
      last_name?: string;
      company?: string;
      job_title?: string;
      notes?: string;
      address_line1?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
      phones?: { phone_number: string; phone_type: string; is_primary: boolean }[];
      emails?: { email: string; email_type: string; is_primary: boolean }[];
    }) => {
      const { phones, emails, ...contactData } = contact;

      const { data, error } = await supabase
        .from("contacts")
        .insert([{ ...contactData, owner_id: user!.id }])
        .select()
        .single();

      if (error) throw error;

      // Insert phones
      if (phones?.length) {
        await supabase.from("contact_phones").insert(
          phones.map(p => ({ ...p, contact_id: data.id }))
        );
      }

      // Insert emails
      if (emails?.length) {
        await supabase.from("contact_emails").insert(
          emails.map(e => ({ ...e, contact_id: data.id }))
        );
      }

      await logAudit({
        action: "team.create",
        entityType: "team",
        entityId: data.id,
        newValues: contact,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({
      id,
      updates,
      phones,
      emails,
    }: {
      id: string;
      updates: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'owner' | 'phones' | 'emails'>>;
      phones?: { phone_number: string; phone_type: string; is_primary: boolean }[];
      emails?: { email: string; email_type: string; is_primary: boolean }[];
    }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update phones (delete and re-insert)
      if (phones !== undefined) {
        await supabase.from("contact_phones").delete().eq("contact_id", id);
        if (phones.length) {
          await supabase.from("contact_phones").insert(
            phones.map(p => ({ ...p, contact_id: id }))
          );
        }
      }

      // Update emails (delete and re-insert)
      if (emails !== undefined) {
        await supabase.from("contact_emails").delete().eq("contact_id", id);
        if (emails.length) {
          await supabase.from("contact_emails").insert(
            emails.map(e => ({ ...e, contact_id: id }))
          );
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
    createContact,
    updateContact,
    deleteContact,
  };
}

export function useContact(contactId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();

      if (error) throw error;

      // Fetch owner, phones, emails
      const [ownerResult, phonesResult, emailsResult] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", data.owner_id).single(),
        supabase.from("contact_phones").select("*").eq("contact_id", contactId).order("is_primary", { ascending: false }),
        supabase.from("contact_emails").select("*").eq("contact_id", contactId).order("is_primary", { ascending: false }),
      ]);

      return {
        ...data,
        owner: ownerResult.data,
        phones: phonesResult.data || [],
        emails: emailsResult.data || [],
      } as Contact;
    },
    enabled: !!user && !!contactId,
  });
}

export function useContactActivities(contactId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const activitiesQuery = useQuery({
    queryKey: ["contact-activities", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_activities")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(activity => ({
        ...activity,
        user: profileMap.get(activity.user_id),
      })) as ContactActivity[];
    },
    enabled: !!user && !!contactId,
  });

  const addActivity = useMutation({
    mutationFn: async (activity: { activity_type: string; description: string }) => {
      const { data, error } = await supabase
        .from("contact_activities")
        .insert([{ ...activity, contact_id: contactId, user_id: user!.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-activities", contactId] });
    },
  });

  return {
    activities: activitiesQuery.data || [],
    isLoading: activitiesQuery.isLoading,
    addActivity,
  };
}

export function useConvertLeadToContact() {
  const { user } = useAuth();
  const { logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      contactData,
    }: {
      leadId: string;
      contactData: {
        first_name: string;
        last_name?: string;
        company?: string;
        job_title?: string;
        phones?: { phone_number: string; phone_type: string; is_primary: boolean }[];
        emails?: { email: string; email_type: string; is_primary: boolean }[];
      };
    }) => {
      const { phones, emails, ...contactFields } = contactData;

      // Create contact with lead reference
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert([{
          ...contactFields,
          lead_id: leadId,
          owner_id: user!.id,
        }])
        .select()
        .single();

      if (contactError) throw contactError;

      // Insert phones
      if (phones?.length) {
        await supabase.from("contact_phones").insert(
          phones.map(p => ({ ...p, contact_id: contact.id }))
        );
      }

      // Insert emails
      if (emails?.length) {
        await supabase.from("contact_emails").insert(
          emails.map(e => ({ ...e, contact_id: contact.id }))
        );
      }

      // Update lead to mark as converted and link to contact
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          status: "converted" as const,
          converted_to_contact_id: contact.id,
        })
        .eq("id", leadId);

      if (leadError) throw leadError;

      await logAudit({
        action: "team.update",
        entityType: "team",
        entityId: leadId,
        newValues: { converted_to_contact_id: contact.id },
      });

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
