export type IAuthenticatedUser = {
  name: string;
  studentId: string;
  studentPublicId?: string;
  campus?: string;
  currentPeriod?: string;
  courseLabel?: string;
};

export type IEnrollmentValidationData = {
  student: {
    code: string;
    url: string;
  };
};
