// ... (Keep existing imports and components)
// Add Referral Config logic to the settings tab

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: referralConfigData } = useDoc<ReferralConfig>(referralConfigRef);

  const referralForm = useForm<{requiredReferrals: number, rewardInterval: number}>({
      defaultValues: { requiredReferrals: 5, rewardInterval: 5 }
  });

  useEffect(() => {
      if (referralConfigData) {
          referralForm.reset(referralConfigData);
      }
  }, [referralConfigData, referralForm]);

  const onReferralSubmit = (values: {requiredReferrals: number, rewardInterval: number}) => {
      if (!firestore || !isAdmin) return;
      setDoc(doc(firestore, 'appConfig', 'referral'), values, { merge: true });
      toast({ title: "تم حفظ إعدادات الإحالة" });
  };

  // ... (Inside the settings tab, add a new accordion item)

  <AccordionItem value="referral-config" className="border-none">
      <Card>
          <AccordionTrigger className="p-4 font-bold text-lg hover:no-underline">إعدادات نظام الإحالة</AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
              <Form {...referralForm}>
                  <form onSubmit={referralForm.handleSubmit(onReferralSubmit)} className="space-y-6">
                      <FormField control={referralForm.control} name="requiredReferrals" render={({ field }) => (
                          <FormItem>
                              <FormLabel>العدد المطلوب لتفعيل البرو لأول مرة</FormLabel>
                              <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                              <FormDescription>عدد الإحالات الناجحة المطلوبة ليصبح المستخدم "برو".</FormDescription>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={referralForm.control} name="rewardInterval" render={({ field }) => (
                          <FormItem>
                              <FormLabel>تراكم الأكواد (كل كم إحالة إضافية؟)</FormLabel>
                              <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                              <FormDescription>بعد تفعيل البرو، سيحصل المستخدم على كود جديد كلما زاد عدد إحالاته بهذا المقدار.</FormDescription>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <Button type="submit" className="w-full">حفظ الإعدادات</Button>
                  </form>
              </Form>
          </AccordionContent>
      </Card>
  </AccordionItem>
