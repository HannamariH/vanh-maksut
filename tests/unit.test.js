const { isExpired } = require("../index")

test("current date is not expired", () => {
    expect(isExpired(new Date(), new Date())).toBe(false)
})

test("next year is not expired", () => {
    let future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    expect(isExpired(future, new Date())).toBe(false)
})

test("next month is not expired", () => {
    let future = new Date()
    future.setMonth(future.getMonth() + 1)
    expect(isExpired(future, new Date())).toBe(false)
})

test("next day is not expired", () => {
    let future = new Date()
    future.setDate(future.getDate() + 1)
    expect(isExpired(future, new Date())).toBe(false)
})

test("wrong parameter types handled correctly", () => {
    expect(isExpired("kissa", 4)).toBe(false)
})

test("3 years ago, month after this month is not expired", () => {
    let past = new Date()
    past.setFullYear(past.getFullYear() - 3)
    past.setMonth(past.getMonth() + 1)
    expect(isExpired(past, new Date())).toBe(false)
})

test("3 years ago, same month, date after this date is not expired", () => {
    let past = new Date()
    past.setFullYear(past.getFullYear() - 3)
    past.setDate(past.getDate() + 1)
    expect(isExpired(past, new Date())).toBe(false)
})

test("exactly 3 years ago is expired", () => {
    let past = new Date()
    past.setFullYear(past.getFullYear() - 3)
    console.log(past)
    expect(isExpired(past, new Date())).toBe(true)
})