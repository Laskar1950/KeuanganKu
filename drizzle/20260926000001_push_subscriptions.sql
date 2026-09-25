CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"expirationTime" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_check" CHECK (length(btrim("push_subscriptions"."endpoint")) > 0),
	CONSTRAINT "push_subscriptions_p256dh_check" CHECK (length(btrim("push_subscriptions"."p256dh")) > 0),
	CONSTRAINT "push_subscriptions_auth_check" CHECK (length(btrim("push_subscriptions"."auth")) > 0)
);--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_family_id_idx" ON "push_subscriptions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_family_user_idx" ON "push_subscriptions" USING btree ("family_id","user_id");--> statement-breakpoint
CREATE POLICY "push_subscriptions_select_own" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("push_subscriptions"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "push_subscriptions_insert_own" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("push_subscriptions"."user_id" = auth.uid() and public.is_family_member("push_subscriptions"."family_id"));--> statement-breakpoint
CREATE POLICY "push_subscriptions_update_own" ON "push_subscriptions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("push_subscriptions"."user_id" = auth.uid()) WITH CHECK ("push_subscriptions"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "push_subscriptions_delete_own" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("push_subscriptions"."user_id" = auth.uid());--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_push_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "push_subscriptions_set_updated_at" BEFORE UPDATE ON "push_subscriptions" FOR EACH ROW EXECUTE FUNCTION public.set_push_subscription_updated_at();--> statement-breakpoint
-- Function to coalesce rapid transaction notifications (debounce) : helper for Edge Function to check recent
CREATE OR REPLACE FUNCTION public.get_recent_notification_count(p_family_id uuid, p_seconds integer DEFAULT 10)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.notifications
  WHERE family_id = p_family_id
    AND type = 'transaction'
    AND created_at > now() - make_interval(secs => p_seconds);
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_recent_notification_count(uuid, integer) TO authenticated;--> statement-breakpoint
