import { useAxios } from "@/hooks/useAxios";
import { useConvert } from "@/hooks/useConvert";
import { ref, computed } from "vue";
import { DepartmentAPI } from "../department/DepartmentAPI";
import { useValidate } from "@/hooks/useValidate";
import { employeeConstants } from "./EmployeeConstants";
import { useHelperStore } from "@/stores/HelperStore";
import { mergeWith } from "lodash-es";
import { data } from "autoprefixer";
const { request } = useAxios();
const helperStore = useHelperStore();
const {
  convertDateDBToUIText,
  convertDatePrimeCalendarToDateDB,
  convertDateUIToDateDB,
  getCurrentTimeString,
} = useConvert();
const { getDepartmentDataAsync } = DepartmentAPI();
const isGettingEmployeeData = ref(false);
// Thông tin sẽ hiển thị lên bảng
const tableInf = [
  {
    field: "EmployeeCode",
    tdStyle: "w-[150px] sm:min-w-40",
  },
  {
    field: "FullName",
    tdStyle: "w-[200px] sm:min-w-56",
  },
  {
    field: "DateOfBirth",
    tdStyle: "w-[120px] sm:min-w-32",
    headerStyle: "min-width: 120px;",
  },
  {
    field: "Gender",
    tdStyle: "w-[200px] sm:min-w-56",
  },
  {
    field: "DepartmentName",
    tdStyle: "w-[200px] sm:min-w-56",
  },
  {
    field: "PositionName",
    tdStyle: "w-[240px] sm:min-w-60",
  },
  {
    field: "BankAccount",
    tdStyle: "w-[200px] sm:min-w-56",
  },
  {
    field: "BankName",
    tdStyle: "w-[200px] sm:min-w-56",
  },
  {
    field: "BankBranch",
    tdStyle: "w-[200px] sm:min-w-56",
  },
];

const departmentOptions = ref();

// Thông tin nhân viên sẽ gửi cho backend
const employeeFormData = ref({});

const formModeEnum = {
  Create: 1,
  Update: 2,
  Delete: 3,
};
const formMode = ref();

// Thông tin nhân viên
const employeeData = ref();

// Thông tin các nhân viên được chọn
const employeeSelected = ref([]);
// Thông tin phân trang
const employeePaging = ref({
  totalRecords: 0,
  page: 1, // Đang xem trang thứ mấy
  pageSize: 20, // Bao nhiêu bản ghi trong trang
  employeeSearchProperty: "", // Thông tin tìm kiếm nhân viên
});
// Danh sách số bản ghi mỗi trang truyển thằng vào BackEndPaginator
const numberRecordsPerPageOptions = [10, 20, 50, 100];

// Thông tin lỗi trên form
const formError = ref({});

// Hiển thị paginator sau khi đã fetch API về thành công để phân trang không bị trống
const paginatorPending = ref(false);
// Thông tin trên bảng các nhân viên
const employeeTableInf = computed(() => {
  const newEmployeeTableInf = mergeWith(
    tableInf,
    employeeConstants[helperStore.language.code]["tableHeader"]
  );
  // console.log(newEmployeeTableInf);
  return newEmployeeTableInf;
});

// Form thông tin nhân viên
const isShowEmployeeForm = ref(false);
const employeeConstantsLanguage = computed(() => {
  return employeeConstants[helperStore.language.code];
});

/**
 * Hàm bỏ chọn tất cả những nhân viên đã chọn
 * Created by: nkmdang 01/03/2024
 */
function unSelectAllEmployee() {
  employeeSelected.value = [];
}

/**
 * Hàm lấy thông tin nhân viên với pending để tránh Paginator không hiện danh sách trang
 * do chưa lấy được tổng số bản ghi
 * Created by: nkmdang 06/01/2024
 */
async function getEmployeeAsyncWitdhPending() {
  paginatorPending.value = false;
  await getEmployeeAsync();
  paginatorPending.value = true;
}

/**
 * Hàm mở Form thông tin nhân viên lên
 * Created by: nkmdang 11/03/2024
 */
async function showEmployeeForm(mode, data) {
  formMode.value = mode;
  if (mode == formModeEnum.Update) {
    employeeFormData.value = {
      ...data.data,
    };
    // employeeFormData.value
  } else if (mode == formModeEnum.Create) {
    const newEmployeeCode = await getNewEmployeeCode();
    employeeFormData.value = {
      EmployeeCode: newEmployeeCode,
    };
  }
  isShowEmployeeForm.value = true;
  // console.log(employeeFormData.value);
}

/**
 * Hàm mở Form thông tin nhân viên lên
 * Created by: nkmdang 11/03/2024
 */
function hideEmployeeForm() {
  isShowEmployeeForm.value = false;
  formError.value = {};
}
/**
 * Hàm mở Dialog xác nhận thực hiện hành động của người dùng
 * Created by: nkmdang 12/03/2024
 */
function showEmployeeFormConfirmDialog(confirm, toast, showDuplicateForm) {
  // console.log(employeeFormData.value.EmployeeCode);
  const dialogContent = employeeConstantsLanguage.value.confirmDialog;
  confirm.require({
    message: dialogContent.message[formMode.value](
      employeeFormData.value.EmployeeCode
    ),
    header: employeeConstantsLanguage.value.confirmDialog.header,
    accept: async () => {
      // Tạo mới một nhân viên
      if (formMode.value === formModeEnum.Create) {
        await createOneEmployeeAsync(toast, helperStore.languageCode);
      } else if (formMode.value === formModeEnum.Update) {
        await updateOneEmployeeAsync(toast, helperStore.languageCode);
      }
      if (showDuplicateForm) {
        employeeFormData.value.EmployeeCode = await getNewEmployeeCode();
      } else {
        if (!formError.value) {
          hideEmployeeForm();
        }
      }
    },
    reject: () => {},
  });
}

/**
 * Confirm Dialog xác nhận có xóa thông tin nhân viên hay không
 * @param {useConfirm() ("primevue/useconfirm")} confirm
 * @param {useToast() ("primevue/usetoast")} toast
 * @param {Object (nhận từ DataTable)} data
 * Created by: nkmdang 11/03/2024
 */
function confirmDeleteOneEmployee(confirm, toast, data) {
  // console.log();
  confirm.require({
    message: employeeConstantsLanguage.value.confirmDialog.message[3](
      data.data.EmployeeCode
    ),
    header: employeeConstantsLanguage.value.confirmDialog.header,
    rejectClass:
      "bg-white !text-primary-500 outline-[1px] outline-[solid] outline-primary-500",
    accept: async () => {
      await deleteEmployeeByIdAsync(toast, data.data.EmployeeId);
    },
    reject: () => {},
  });
}

/**
 * Hàm lấy thông tin nhân viên từ Backend theo phân trang
 * Created by: nkmdang 01/03/2024
 */
async function getEmployeeAsync() {
  isGettingEmployeeData.value = true;
  const response = await request({
    url: `Employees?page=${employeePaging.value.page}&pageSize=${employeePaging.value.pageSize}&employeeProperty=${employeePaging.value.employeeSearchProperty}`,
    method: "get",
  });
  isGettingEmployeeData.value = false;
  // console.log(response);
  // Chuyển đổi định dạng ngày tháng trong db thành dd/mm/yyyy
  for (let i = 0; i < response.data.length; i++) {
    response.data[i].DateOfBirth = convertDateDBToUIText(
      response.data[i].DateOfBirth
    );
    response.data[i].PICreatedDate = convertDateDBToUIText(
      response.data[i].PICreatedDate
    );
  }
  employeeData.value = response.data;
  // console.log(employeeData.value);
  employeePaging.value.totalRecords = response.countEmployees;
}

/**
 * Hàm thêm mới một nhân viên
 * @param {ToastServiceMethods} toast Toast service dùng để mở Toast
 * @param {String} languageCode
 * Created by: nkmdang 18/03/2024
 */
async function createOneEmployeeAsync(toast, languageCode) {
  try {
    const data = convertEmployeeFormDataToFormData(formModeEnum.Create);
    if (!validateEmployeeFormData(data)) {
      return;
    }
    const response = await request(
      {
        url: `Employees`,
        method: "post",
        data,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
      toast
    );
    await getEmployeeAsync();
    const toastContent = employeeConstantsLanguage.value.Toast;
    toast.add(toastContent.ActionEmployeeSuccess(toastContent[formMode.value]));
  } catch (error) {
    console.log(error);
    if (error.response.status === 400) {
    }
  }
}

/**
 * Hàm cập nhật thông tin một nhân viên
 * @param {ToastServiceMethods} toast Toast service dùng để mở Toast
 * @param {} languageCode
 * Created by: nkmdang 18/03/2024
 */
async function updateOneEmployeeAsync(toast, languageCode) {
  try {
    const data = convertEmployeeFormDataToFormData(formModeEnum.Update);
    if (!validateEmployeeFormData(data)) {
      return;
    }
    const response = await request(
      {
        url: `Employees/${employeeFormData.value.EmployeeId}`,
        method: "put",
        data,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
      toast
    );
    await getEmployeeAsync();
    const toastContent = employeeConstantsLanguage.value.Toast;
    toast.add(toastContent.ActionEmployeeSuccess(toastContent[formMode.value]));
  } catch (error) {
    console.log(error);
  }
}
/**
 * Hàm chuyển đổi employeeFormData từ Object sang FormData
 * @returns FormData
 * Created by: nkmdang 18/03/2024
 */
function convertEmployeeFormDataToFormData(mode) {
  const formData = new FormData();
  for (let key in employeeFormData.value) {
    formData.append(key, employeeFormData.value[key]);
  }
  if (mode === formModeEnum.Create) {
    if (employeeFormData.value.DateOfBirth) {
      console.log(employeeFormData.value.DateOfBirth);
      formData.set(
        "DateOfBirth",
        convertDatePrimeCalendarToDateDB(employeeFormData.value.DateOfBirth)
      );
    }
    if (employeeData.value.PICreatedDate) {
      formData.set(
        "PICreatedDate",
        convertDatePrimeCalendarToDateDB(employeeFormData.value.PICreatedDate)
      );
    }
  } else if (mode === formModeEnum.Update) {
    if (employeeFormData.value.DateOfBirth) {
      formData.set(
        "DateOfBirth",
        convertDateUIToDateDB(employeeFormData.value.DateOfBirth)
      );
    }
    if (employeeFormData.value.PICreatedDate) {
      formData.set(
        "PICreatedDate",
        convertDateUIToDateDB(employeeFormData.value.PICreatedDate)
      );
    }
  }
  formData.set("ModifiedDate", getCurrentTimeString());
  formData.set("DepartmentId", employeeFormData.value.Department?.DepartmentId);
  return formData;
}

/**
 * Hàm validate các thông tin nhân viên
 * @returns Boolean
 */
function validateEmployeeFormData(formData) {
  const errorObject = {};
  let isError = false;
  const {
    validateCorrectLength,
    validateCustomRequireAndMaxlength,
    validateByRegex,
    validateWorkingAge,
    validateDateNotMoreThanTargetDate,
  } = useValidate();
  const employeeFieldValidate = {
    EmployeeCode: {
      regex: /^NV-00[0-9]{4}$/,
      require: true,
    },
    FullName: {
      maxLength: 255,
      require: true,
    },
    DepartmentId: {
      length: 36,
      require: true,
    },
    PositionName: {
      maxLength: 255,
      require: false,
    },
    BankName: {
      maxLength: 255,
      require: false,
    },
    BankBranch: {
      maxLength: 255,
      require: false,
    },
    PersonalIdentification: {
      regex: /^0[0-9]{9}$/,
      require: false,
    },
    Address: {
      maxLength: 255,
      require: false,
    },
    PICreatedPlace: {
      maxLength: 255,
      require: false,
    },
    Mobile: {
      regex: /(84|0[3|5|7|8|9])+([0-9]{8})\b/g,
      require: false,
    },
  };

  for (let field in employeeFieldValidate) {
    for (let key in employeeFieldValidate[field]) {
      if (key == "maxLength") {
        const errorMessageField = employeeFieldValidate[field].require
          ? "MaxLengthAndRequire"
          : "Length";
        errorObject[field] = validateCustomRequireAndMaxlength(
          formData.get(field),
          employeeConstantsLanguage.value.formError[field + errorMessageField],
          employeeFieldValidate[field].require
        );
      } else if (key == "regex") {
        if (employeeFieldValidate[field].require) {
          errorObject[field] = validateByRegex(
            formData.get(field),
            employeeConstantsLanguage.value.formError[field + "InvalidFormat"],
            employeeFieldValidate[field].regex
          );
        } else if (formData.get(field)) {
          errorObject[field] = validateByRegex(
            formData.get(field),
            employeeConstantsLanguage.value.formError[field + "InvalidFormat"],
            employeeFieldValidate[field].regex
          );
        }
      }
    }
  }
  const departmentId = formData.get("DepartmentId");
  if (departmentId == "undefined") {
    errorObject.Department =
      employeeConstantsLanguage.value.formError.DepartmentEmty;
  }
  const dateOfBirth = formData.get("DateOfBirth");
  if (formData.get("DateOfBirth") != "undefined") {
    const gender = formData.get("Gender") || 2;
    errorObject.DateOfBirth = validateWorkingAge(
      formData.get("DateOfBirth"),
      employeeConstantsLanguage.value.formError.DateOfBirthGenderInvalid[
        gender
      ],
      helperStore.workingStartAge,
      helperStore.workingEndAge[gender]
    );
  }

  if (formData.get("PICreatedDate") != "undefined") {
    errorObject.PICreatedDate = validateDateNotMoreThanTargetDate(
      formData.get("PICreatedDate"),
      employeeConstantsLanguage.value.formError.PICreatedDateInfuture
    );
  }
  console.log(errorObject);
  for (let key in errorObject) {
    if (errorObject[key]) {
      formError.value = errorObject;
      return false;
    }
  }

  return true;
}

function handleEmployeeFormDataError(error) {
  if (error.response?.status === 400) {
  }
}

/**
 * Hàm xóa thông tin nhân viên theo Id
 * @param {Guid (String)} employeeId
 * @returns
 */
async function deleteEmployeeByIdAsync(toast, employeeId) {
  const response = await request({
    url: `Employees/${employeeId}`,
    method: "delete",
  });
  await getEmployeeAsync();
  return response;
}

/**
 * Hàm lấy mã nhân viên mới từ backend
 * @returns Mã nhân viên mới
 * Created by: nkmdang 14/03/2024
 */
async function getNewEmployeeCode() {
  const response = await request({
    url: "Employees/NewEmployeeCode",
    method: "get",
  });
  return response;
}

/**
 * Hàm nhận file excel từ backend
 * @param {Int} page
 * @param {Int} pageSize
 * @param {String} employeeProperty
 *
 * Created By: nkmdang 10/10/2023
 */
async function exportExcelCurrentPage(page, pageSize, employeeProperty, aRef) {
  // this.employeePropertyExcel = this.employeeProperty;
  try {
    this.notificationStore.showLoading();
    const response = await axios.get(
      `Employees/EmployeesExcel?page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          Authorization: `Bearer ${this.userStore.accessToken}`,
        },
        responseType: "blob",
      }
    );
    // Tạo một Blob từ dữ liệu trả về từ API
    const blob = new Blob([response.data]);

    // Tạo URL cho Blob
    const url = window.URL.createObjectURL(blob);

    // Lấy thẻ <a> tải xuống và đặt href là URL của Blob
    aRef.href = url;

    // Đặt tên tệp Excel mà bạn muốn khi người dùng tải về
    aRef.download = "Danh_sach_nhan_vien.xlsx";

    // Simulate a click to trigger the download
    aRef.click();

    // Giải phóng URL để tránh rò rỉ bộ nhớ
    window.URL.revokeObjectURL(url);
    // console.log(response);
    this.notificationStore.hideLoading();
  } catch (error) {
    this.notificationStore.hideLoading();
    console.log(error);
    this.notificationStore.showToastMessage(
      this.resourceLanguage.ToastMessage.CannotExportExcel
    );
  }
}

// Deparment

/**
 * Hàm lấy thông tin các đơn vị để đưa vào Dropdown
 * Created by: nkmdang 13/03/2024
 */
async function getDepartmentOptionsAsync() {
  const response = await getDepartmentDataAsync();
  departmentOptions.value = [];
  response.forEach((department) => {
    departmentOptions.value.push(department.DepartmentName);
  });
}

export function EmployeeService() {
  return {
    isGettingEmployeeData,
    isShowEmployeeForm,
    employeeData,
    employeeSelected,
    employeePaging,
    employeeFormData,
    tableInf,
    numberRecordsPerPageOptions,
    departmentOptions,
    formMode,
    formModeEnum,
    employeeTableInf,
    employeeConstantsLanguage,
    paginatorPending,
    formError,
    showEmployeeForm,
    showEmployeeFormConfirmDialog,
    hideEmployeeForm,
    unSelectAllEmployee,
    confirmDeleteOneEmployee,
    getEmployeeAsyncWitdhPending,
    getNewEmployeeCode,
    getEmployeeAsync,
    createOneEmployeeAsync,
    updateOneEmployeeAsync,
    deleteEmployeeByIdAsync,
    getDepartmentOptionsAsync,
    exportExcelCurrentPage,
  };
}
