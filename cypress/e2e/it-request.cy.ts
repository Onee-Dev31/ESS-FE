// cypress/e2e/it-request.cy.ts
describe('IT Problem Report Form', () => {

    before(() => {
        // login ครั้งเดียวพอ ไม่ต้อง login ทุก test
        cy.loginWithUI();
    });

    beforeEach(() => {
        // navigate ไปหน้าที่ต้องการทดสอบ
        cy.visit('/it-problem-report');
        cy.url().should('include', '/it-problem-report');
    });


    it('should fill form completely and submit successfully', () => {

        // ───────────────────────────────
        // STEP 1: กรอก หัวข้อปัญหา
        // ───────────────────────────────
        cy.get('input[placeholder="ระบุหัวข้อปัญหาสั้นๆ..."]')
            .should('be.visible')
            .type('คอมพิวเตอร์เปิดไม่ติด');

        // ───────────────────────────────
        // STEP 2: กรอก รายละเอียดปัญหา
        // ───────────────────────────────
        cy.get('textarea[placeholder="อธิบายรายละเอียดปัญหาที่พบ..."]')
            .should('be.visible')
            .type('เมื่อกดปุ่ม Power แล้วเครื่องไม่ติด ไฟไม่ขึ้น ลองถอดปลั๊กแล้วเสียบใหม่แล้วแต่ยังไม่ได้');

        // ───────────────────────────────
        // STEP 2.5: เลือก หมวดหมู่ปัญหา (เพิ่มหลังกรอกรายละเอียด)
        // ───────────────────────────────

        // // วิธีที่ 1: เลือกตาม index (กดหมวดหมู่แรก)
        // cy.get('.cat-tag').first().click();

        // // วิธีที่ 2: เลือกตามชื่อหมวดหมู่ (แนะนำ)
        // cy.get('.cat-tag').contains('Hardware').click();
        // cy.get('.cat-tag').contains('Network').click();
        cy.get('.cat-tag').contains('Hardware').click();
        cy.get('.selected-chip').should('exist'); // เช็คแค่ว่ามีอยู่ใน DOM
        // ตรวจสอบว่า chip โชว์ใน textarea bar
        cy.get('.selected-chips-bar').should('contain.text', 'Hardware');

        // ───────────────────────────────
        // STEP 3: แนบไฟล์
        // ───────────────────────────────
        cy.get('input[type="file"]')
            .selectFile('cypress/fixtures/test-file1.jpg', { force: true });

        // ตรวจสอบว่าไฟล์แนบแสดงใน list
        cy.get('.file-name')
            .should('be.visible')
            .and('contain.text', 'test-file1.jpg');

        // ───────────────────────────────
        // STEP 4: กรอก เบอร์โทรติดต่อ
        // ───────────────────────────────
        cy.get('input[placeholder="ระบุเบอร์โทรศัพท์ที่สามารถติดต่อได้..."]')
            .should('be.visible')
            .type('1234');

        // ───────────────────────────────
        // STEP 5: กดปุ่ม ส่งคำร้อง
        // ───────────────────────────────
        cy.get('.btn-primary-action')
            .should('not.be.disabled')
            .click();

        // ───────────────────────────────
        // STEP 6: ตรวจสอบ Summary Modal
        // ───────────────────────────────
        cy.get('.modal-overlay').should('be.visible');
        cy.get('.modal-header h2').should('contain.text', 'ยืนยันการแจ้งปัญหา');

        // ตรวจสอบข้อมูลใน Modal ตรงกับที่กรอก
        cy.get('.info-table').within(() => {
            cy.contains('th', 'หัวข้อปัญหา')
                .siblings('td')
                .should('contain.text', 'คอมพิวเตอร์เปิดไม่ติด');

            cy.contains('th', 'รายละเอียด')
                .siblings('td')
                .should('contain.text', 'เมื่อกดปุ่ม Power แล้วเครื่องไม่ติด');

            cy.contains('th', 'หมวดหมู่').siblings('td')
                .should('contain.text', 'Hardware');

            cy.contains('th', 'เบอร์โทรติดต่อ')
                .siblings('td')
                .should('contain.text', '123-4');

            cy.contains('th', 'ไฟล์แนบ')
                .siblings('td')
                .should('contain.text', 'test-file1.jpg');
        });

        // ───────────────────────────────
        // STEP 7: กดปุ่ม ยืนยันการส่ง → เชื่อมต่อ API จริง
        // ───────────────────────────────
        cy.get('.btn-confirm')
            .should('be.visible')
            .click();

        // ───────────────────────────────
        // STEP 8: ตรวจสอบผลลัพธ์หลัง submit
        // ───────────────────────────────
        // ปรับให้ตรงกับ behavior จริงของระบบ เช่น redirect / success message
        cy.get('.modal-overlay').should('not.exist'); // modal ปิด
        // cy.url().should('include', '/it-request/success'); // หรือ redirect
        // cy.get('.success-message').should('be.visible');   // หรือแสดง toast
    });

});